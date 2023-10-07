const path = require("path");
const { run } = require("jest-cli");

class Test {
  static async run(files) {
    process.env.AUX4_TEST_FILES = files.join(",");
    const dir = path.resolve(`${__dirname}/test`);
    await run([dir]);
  }
}

module.exports = Test;
