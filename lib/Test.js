const path = require("path");
const cp = require("child_process");

class Test {
  static async run(testFileDir, files) {
    const projectRoot = testFileDir;
    const testDir = path.resolve(projectRoot, "test");
    await new Promise((resolve, reject) => {
      const child = cp.spawn(
        "jest",
        [
          "--config",
          JSON.stringify({}),
          "--verbose",
          "--colors",
          "--cache=false",
          "--runInBand",
          "--rootDir",
          projectRoot,
          "--projects",
          projectRoot,
          "--testPathPattern",
          `${testDir}/*`
        ],
        {
          stdio: "inherit",
          cwd: projectRoot,
          env: {
            ...process.env,
            NODE_PATH: path.resolve(testDir, "node_modules"),
            AUX4_TEST_FILES: files.join(",")
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
