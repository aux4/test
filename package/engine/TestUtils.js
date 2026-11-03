const path = require("path");
const fs = require("fs");
const stripColorModule = require("strip-color");
const stripColor = typeof stripColorModule === 'function' ? stripColorModule : stripColorModule.default || function(str) {
  return str.replace(/\x1B[[(?);]{0,2}(;?\d)*./g, '');
};
const childProcess = require("child_process");

class ExecutorError extends Error {
  constructor(message, cause, exitCode, stdout, stderr) {
    super(message);
    this.cause = cause;
    this.exitCode = exitCode;
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

const isWindows = process.platform === "win32";

let windowsShell;

// Test command lines are POSIX shell. child_process.exec runs them with cmd.exe on Windows, so use
// bash there instead: $SHELL when it is a bash that exists, otherwise Git for Windows' bash (found
// next to git.exe on PATH or in its default install location).
function findWindowsShell() {
  if (windowsShell !== undefined) {
    return windowsShell;
  }
  const isFile = file => {
    try {
      return fs.statSync(file).isFile();
    } catch {
      return false;
    }
  };
  const candidates = [];
  const shell = process.env.SHELL;
  if (shell && /bash(\.exe)?$/i.test(shell) && !shell.startsWith("/")) {
    candidates.push(shell, `${shell}.exe`);
  }
  const dirs = (process.env.PATH || process.env.Path || "").split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    if (isFile(path.join(dir, "git.exe"))) {
      for (const root of [path.dirname(dir), path.dirname(path.dirname(dir))]) {
        candidates.push(path.join(root, "bin", "bash.exe"), path.join(root, "usr", "bin", "bash.exe"));
      }
    }
  }
  for (const env of ["ProgramW6432", "ProgramFiles", "ProgramFiles(x86)"]) {
    if (process.env[env]) {
      candidates.push(path.join(process.env[env], "Git", "bin", "bash.exe"));
    }
  }
  if (process.env.LOCALAPPDATA) {
    candidates.push(path.join(process.env.LOCALAPPDATA, "Programs", "Git", "bin", "bash.exe"));
  }
  windowsShell = candidates.find(isFile) || null;
  return windowsShell;
}

function shellOptions() {
  if (!isWindows) {
    return {};
  }
  const shell = findWindowsShell();
  if (!shell) {
    throw new Error("aux4/test runs test commands with bash, and no bash was found: install Git for Windows (https://git-scm.com/download/win)");
  }
  return { shell };
}

// Windows programs end lines with CRLF; expectations in .test.md files use LF.
function normalizeNewlines(text) {
  return isWindows && typeof text === "string" ? text.replace(/\r\n/g, "\n") : text;
}

function runCliCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    const out = {};
    const child = childProcess.exec(
      command,
      { maxBuffer: Infinity, ...shellOptions(), ...options, env: { ...process.env } },
      (err, stdout, stderr) => {
        if (err) {
          reject(new ExecutorError(err.message, err, out.exitCode, stdout, stderr));
        } else {
          resolve({ exitCode: out.exitCode, stdout, stderr });
        }
      }
    );
    child.on("exit", exitCode => {
      out.exitCode = exitCode;
    });
  });
}

function resolve(dir, filename, files) {
  let file = path.resolve(dir, filename);

  if (!fs.existsSync(file)) {
    if (!fs.existsSync(`${file}.test.md`)) {
      throw new Error(`File ${filename} not found`);
    } else {
      file = `${file}.test.md`;
    }
  }

  if (fs.lstatSync(file).isDirectory()) {
    fs.readdirSync(file).forEach(child => resolve(file, child, files));
  } else if (file.endsWith(".test.md")) {
    files.push(file);
  }
}

async function executeCommand(command, directory) {
  let exitCode, stdout, stderr;

  try {
    const result = await runCliCommand(command, { cwd: directory });
    exitCode = result.exitCode;
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (err) {
    if (err instanceof ExecutorError) {
      exitCode = err.exitCode;
      stdout = err.stdout;
      stderr = err.stderr;
    } else {
      throw err;
    }
  }

  stdout = normalizeNewlines(stdout);
  stderr = normalizeNewlines(stderr);

  if (stdout && stdout.endsWith("\n")) {
    stdout = stripColor(stdout.slice(0, -1) || "");
  }

  if (stderr && stderr.endsWith("\n")) {
    stderr = stripColor(stderr.slice(0, -1) || "");
  }

  return { exitCode, stdout, stderr };
}

function substituteVariables(text, params) {
  if (!text || !params || Object.keys(params).length === 0) return text;
  return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    const trimmed = varName.trim();
    return params.hasOwnProperty(trimmed) ? params[trimmed] : match;
  });
}

function findSuiteFile(dir) {
  const suiteFile = path.resolve(dir, "test.suite.md");
  return fs.existsSync(suiteFile) ? suiteFile : null;
}

function resolveSuite(dir, groups, selectedGroups) {
  let filtered;
  if (selectedGroups && selectedGroups.length > 0) {
    filtered = groups.filter(g => selectedGroups.includes(g.title));
  } else {
    filtered = groups.filter(g => !g.optional);
  }

  const files = [];
  for (const group of filtered) {
    for (const file of group.files) {
      files.push(path.resolve(dir, file));
    }
  }
  return files;
}

module.exports = { resolve, executeCommand, substituteVariables, findSuiteFile, resolveSuite };
