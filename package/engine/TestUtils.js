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

function runCliCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    const out = {};
    const child = childProcess.exec(
      command,
      { maxBuffer: Infinity, ...options, env: { ...process.env } },
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
