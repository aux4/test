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
      it(`${test.title || `${index + 1}. should print output`}`, async () => {
        const { stdout, stderr } = await executeCommand(test.execute, directory);

        if (test.expect) {
          expect(test.expect).toEqual(stdout);
        }

        if (test.error) {
          expect(test.error).toEqual(stderr);
        }
      });
    });

    scenario.children.forEach((child, childIndex) => {
      createScenario(childIndex, child, directory, `${prefix}${index + 1}.`);
    });
  });
}
