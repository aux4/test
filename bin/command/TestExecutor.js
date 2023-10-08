const Test = require("../../lib/Test");
const { resolve } = require("../../lib/TestUtils");

class TestExecutor {
  static async run(params, action) {
    const files = [];
    action.forEach(file => resolve(".", file, files));
    if (files.length === 0) {
      resolve(".", ".", files);
    }
    await Test.run(files);
  }

  static async coverage(params, action) {
    const files = [];
    action.forEach(file => resolve(".", file, files));
    if (files.length === 0) {
      resolve(".", ".", files);
    }
    await Test.coverage(files);
  }
}

module.exports = TestExecutor;
