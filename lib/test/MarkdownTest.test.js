const colors = require("colors");
const { Command } = require("@aux4/engine");
const MarkdownTestParser = require("lib/MarkdownTestParser");

const files = process.env.AUX4_TEST_FILES || "";

files.split(",").forEach(file => {
  const fileName = file.split("/").pop();

  describe(`Test file ${fileName}`.cyan, () => {
    const scenarios = MarkdownTestParser.parse(file);

    scenarios.forEach((scenario, index) => createScenario(index, scenario));
  });
});

function createScenario(index, scenario, prefix = "") {
  describe(`${prefix}${index + 1}. ${scenario.title}`, () => {
    scenario.tests.forEach((test, index) => {
      it(`${test.title || `${index + 1}. should print output`}`, async () => {
        let output, errorOutput;

        try {
          const { stdout, stderr } = await Command.execute(test.execute);
          output = stdout;
          errorOutput = stderr;
        } catch (e) {
          output = e.stdout;
          errorOutput = e.stderr;

          if (!test.error) {
            throw e;
          }
        }

        if (test.expect) {
          expect(output?.trim()).toEqual(test.expect);
        }

        if (test.error) {
          expect(errorOutput?.trim()).toEqual(test.error);
        }
      });
    });

    scenario.children.forEach((child, childIndex) => {
      createScenario(childIndex, child, `${prefix}${index + 1}.`);
    });
  });
}
