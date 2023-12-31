const colors = require("colors");
const fs = require("fs");
const stripColor = require("strip-color");
const { Command, Output } = require("@aux4/engine");
const MarkdownTestParser = require("../MarkdownTestParser");
const { executeCommand } = require("../TestUtils");

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
  const coveragePath = process.env.AUX4_TEST_COVERAGE_PATH;

  describe(`${prefix}${index + 1}. ${scenario.title}`, () => {
    (scenario.files || []).forEach(file => {
      beforeEach(() => {
        try {
          fs.writeFileSync(`${directory}/${file.name}`, file.content);
        } catch (e) {
          Output.println(`Cannot write file ${directory}/${file.name}`.red);
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
          const { stdout, stderr } = await Command.execute(cmd, undefined, { cwd: directory });
          if (stderr) {
            Output.println(stderr.red);
          }

          if (stdout) {
            Output.println(stdout);
          }
        });
      });
    });

    (scenario.tests || []).forEach((test, index) => {
      it(`${test.title || `${index + 1}. should print output`}`, async () => {
        const nyc = `nyc --temp-dir '${coveragePath}' --no-clean --reporter none`;
        const cmd = coveragePath ? `${nyc} ${test.execute.replaceAll("| node ", `| ${nyc} node `)}` : test.execute;

        const { stdout, stderr } = await executeCommand(cmd, directory);

        if (test.expect) {
          expect(stdout).toEqual(test.expect);
        }

        if (test.error) {
          expect(stderr).toEqual(test.error);
        }
      });
    });

    scenario.children.forEach((child, childIndex) => {
      createScenario(childIndex, child, directory, `${prefix}${index + 1}.`);
    });
  });
}
