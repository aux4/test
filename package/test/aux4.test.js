const colors = require("colors");
const fs = require("fs");
const MarkdownTestParser = require("./MarkdownTestParser");
const { executeCommand } = require("./TestUtils");

const files = process.env.AUX4_TEST_FILES || "";

files.split(",").forEach(file => {
  const fileName = file.split("/").pop();
  const directory = file.substring(0, file.lastIndexOf("/"));

  describe(`Test file ${fileName}`.cyan, () => {
    const scenarios = MarkdownTestParser.parse(file);

    scenarios.forEach((scenario, index) => createScenario(index, scenario, directory));
  });
});

function createScenario(index, scenario, directory, prefix = "") {
  describe(`${prefix}${index + 1}. ${scenario.title}`, () => {
    (scenario.files || []).forEach(file => {
      beforeEach(() => {
        try {
          fs.writeFileSync(`${directory}/${file.name}`, file.content);
        } catch (e) {
          console.log(`Cannot write file ${directory}/${file.name}`.red);
        }
      });

      afterEach(() => {
        fs.unlinkSync(`${directory}/${file.name}`);
      });
    });

    [
      { list: scenario.beforeAllCommands, method: beforeAll },
      { list: scenario.afterAllCommands, method: afterAll },
      { list: scenario.beforeEachCommands, method: beforeEach },
      { list: scenario.afterEachCommands, method: afterEach }
    ].forEach(({ list, method }) => {
      list.forEach(cmd => {
        method(async () => {
          const { stdout, stderr } = await executeCommand(cmd, directory);
          if (stderr) {
            console.log(stderr.red);
          }

          if (stdout) {
            console.log(stdout);
          }
        });
      });
    });

    (scenario.tests || []).forEach((test, index) => {
      const testFunction = async () => {
        const { stdout, stderr, exitCode } = await executeCommand(test.execute, directory);

        if (test.expects && test.expects.length > 0) {
          test.expects.forEach(expectObj => {
            let expectedValue = expectObj.expect;
            let actualValue = stdout;

            if (expectObj.expectRegex) {
              let flags = "";
              if (expectObj.expectIgnoreCase) {
                flags += "i";
              }
              const regex = new RegExp(expectedValue, flags);
              expect(actualValue).toMatch(regex);
            } else {
              if (expectObj.expectIgnoreCase) {
                expectedValue = expectedValue.toLowerCase();
                actualValue = actualValue.toLowerCase();
              }

              if (expectObj.expectPartial) {
                expect(actualValue).toContain(expectedValue);
              } else {
                expect(actualValue).toEqual(expectedValue);
              }
            }
          });
        }

        if (test.errors && test.errors.length > 0) {
          test.errors.forEach(errorObj => {
            let expectedError = errorObj.error;
            let actualError = stderr;

            if (errorObj.errorRegex) {
              let flags = "";
              if (errorObj.errorIgnoreCase) {
                flags += "i";
              }
              const regex = new RegExp(expectedError, flags);
              expect(actualError).toMatch(regex);
            } else {
              if (errorObj.errorIgnoreCase) {
                expectedError = expectedError.toLowerCase();
                actualError = actualError.toLowerCase();
              }

              if (errorObj.errorPartial) {
                expect(actualError).toContain(expectedError);
              } else {
                expect(actualError).toEqual(expectedError);
              }
            }
          });
        } else if (exitCode !== 0) {
          throw new Error(
            `Error executing command:\n  ${test.execute.yellow}\n  ${(stderr || "").replace("\n", "\n  ").red}`
          );
        }
      };

      if (test.timeout) {
        it(`${test.title || `${index + 1}. should print output`}`, testFunction, test.timeout);
      } else {
        it(`${test.title || `${index + 1}. should print output`}`, testFunction);
      }
    });

    scenario.children.forEach((child, childIndex) => {
      createScenario(childIndex, child, directory, `${prefix}${index + 1}.`);
    });
  });
}
