const path = require("path");
const jest = require("jest");
const NYC = require("nyc");

class Test {
  static async run(files) {
    process.env.AUX4_TEST_FILES = files.join(",");
    const dir = path.resolve(path.join(__dirname, "test"));
    await jest.runCLI(
      {
        verbose: true,
        cache: false,
        rootDir: path.resolve(path.join(__dirname, "..")),
        projects: [path.resolve(path.join(__dirname, ".."))],
        testPathPattern: [`${dir}/*`]
      },
      [dir]
    );
  }

  static async coverage(files) {
    process.env.AUX4_TEST_FILES = files.join(",");
    process.env.AUX4_TEST_COVERAGE_PATH = path.resolve(path.join(".", ".nyc_output"));

    const nyc = new NYC({ tempDirectory: process.env.AUX4_TEST_COVERAGE_PATH });
    await nyc.createTempDirectory();

    const dir = path.resolve(path.join(__dirname, "test"));
    await jest.runCLI(
      {
        verbose: true,
        cache: false,
        rootDir: path.resolve(path.join(__dirname, "..")),
        projects: [path.resolve(path.join(__dirname, ".."))],
        testPathPattern: [`${dir}/*`],
        coverage: true,
        collectCoverage: true,
        coverageReporters: ["none"]
      },
      [dir]
    );

    await nyc.writeCoverageFile();
    await nyc.report();
  }
}

module.exports = Test;
