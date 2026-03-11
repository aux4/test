const path = require("path");
const Test = require("../../lib/Test");
const { resolve, findSuiteFile, resolveSuite } = require("../../package/engine/TestUtils");
const { parseSuiteFile } = require("../../package/engine/TestSuiteParser");

class TestExecutor {
  static async run(testFileDir, action, params = {}) {
    const files = [];
    const fs = require("fs");

    const targetDir = (action.length === 1 && fs.existsSync(action[0]) && fs.lstatSync(action[0]).isDirectory()) ? action[0] : null;

    if (targetDir) {
      const suiteFile = findSuiteFile(targetDir);
      if (suiteFile) {
        const groups = parseSuiteFile(suiteFile);
        const groupEnv = process.env.AUX4_TEST_GROUP || "";
        const selectedGroups = groupEnv ? groupEnv.split(",").map(g => g.trim()).filter(Boolean) : [];
        const suiteDir = path.dirname(suiteFile);
        const resolved = resolveSuite(suiteDir, groups, selectedGroups);
        files.push(...resolved);
      } else {
        resolve(".", targetDir, files);
      }
    } else if (action.length === 0) {
      resolve(".", ".", files);
    } else {
      action.forEach(file => resolve(".", file, files));
      if (files.length === 0) {
        resolve(".", ".", files);
      }
    }

    await Test.run(testFileDir, files, params);
  }
}

module.exports = TestExecutor;
