const path = require("path");
const jest = require("jest");

class Test {
  static async run(files) {
    process.env.AUX4_TEST_FILES = files.join(",");
    const dir = path.resolve(path.join(__dirname, "test"));
    await jest.runCLI({ rootDir: path.join(__dirname, "..") }, [dir]);
  }
}

module.exports = Test;
