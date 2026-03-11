const path = require("path");
const cp = require("child_process");

class Test {
  static async run(testFileDir, files, params = {}) {
    const projectRoot = testFileDir;
    const testDir = path.resolve(projectRoot, "engine");
    await new Promise((resolve, reject) => {
      const child = cp.spawn(
        "jest",
        [
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
        ],
        {
          stdio: "inherit",
          cwd: projectRoot,
          env: {
            ...process.env,
            NODE_PATH: path.resolve(testDir, "node_modules"),
            AUX4_TEST_FILES: files.join(","),
            AUX4_TEST_PARAMS: JSON.stringify(params)
          }
        }
      );
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

module.exports = Test;
