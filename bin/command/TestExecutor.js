const Test = require("../../lib/Test");
const { resolve } = require("../../package/engine/TestUtils");

class TestExecutor {
  static async run(testFileDir, action) {
    const files = [];
    action.forEach(file => resolve(".", file, files));
    if (files.length === 0) {
      resolve(".", ".", files);
    }
    await Test.run(testFileDir, files);
  }
}

module.exports = TestExecutor;
