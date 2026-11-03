const path = require("path");
const fs = require("fs");
const cp = require("child_process");

const isWindows = process.platform === "win32";

// On Windows npm installs jest as jest.cmd, which spawn() can't start without a shell (and passing the
// JSON --config through cmd.exe would need re-quoting). Run jest's own entry point with node instead:
// the global jest next to jest.cmd on PATH (installed with this platform's native modules), else the
// jest bundled with this package.
function findWindowsJest(engineDir) {
  const dirs = (process.env.PATH || process.env.Path || "").split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    if (fs.existsSync(path.join(dir, "jest.cmd"))) {
      const entry = path.join(dir, "node_modules", "jest", "bin", "jest.js");
      if (fs.existsSync(entry)) {
        return entry;
      }
    }
  }
  const bundled = path.join(engineDir, "node_modules", "jest", "bin", "jest.js");
  if (fs.existsSync(bundled)) {
    return bundled;
  }
  return null;
}

// jest matches --testPathPatterns as a regular expression against native paths. A Windows path's
// backslashes would be read as regex escapes, so escape the path and write it with forward slashes,
// which jest maps to the platform separator.
function windowsTestPathPattern(testDir) {
  return testDir
    .split(/[\\/]/)
    .join("/")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "/";
}

class Test {
  static async run(testFileDir, files, params = {}) {
    const projectRoot = testFileDir;
    const testDir = path.resolve(projectRoot, "engine");

    let command = "jest";
    const args = [
      "--config",
      JSON.stringify({ transform: {} }),
      "--verbose",
      "--colors",
      "--cache=false",
      "--runInBand",
      "--forceExit",
      "--noStackTrace",
      "--rootDir",
      projectRoot,
      "--projects",
      projectRoot,
      "--testPathPatterns",
      `${testDir}/*`
    ];

    if (isWindows) {
      const jest = findWindowsJest(testDir);
      if (!jest) {
        throw new Error("jest was not found: install it with `npm install -g jest`");
      }
      command = process.execPath;
      args.unshift(jest);
      args[args.length - 1] = windowsTestPathPattern(testDir);
    }

    await new Promise((resolve, reject) => {
      const child = cp.spawn(command, args, {
        stdio: "inherit",
        cwd: projectRoot,
        env: {
          ...process.env,
          NODE_PATH: path.resolve(testDir, "node_modules"),
          AUX4_TEST_FILES: files.join(","),
          AUX4_TEST_PARAMS: JSON.stringify(params)
        }
      });
      child.on("error", reject);
      child.on("exit", code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Jest exited with code ${code}`));
        }
      });
    });
  }
}

Test.windowsTestPathPattern = windowsTestPathPattern;

module.exports = Test;
