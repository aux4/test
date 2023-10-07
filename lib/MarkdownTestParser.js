const colors = require("colors");
const fs = require("fs");

const SCENARIO_TITLE_REGEX = /^#\s+.+$/g;
const CHILD_SCENARIO_TITLE_REGEX = /^#{2,6}\s+.+$/g;
const TEST_REGEX =
  /(^-\s(?<title>[^\n]+)\s+)?```execute\s(?<execute>.+?)\s```(\s+```expect\s(?<expect>.+?)\s```)?(\s+```error\s(?<error>.+?)\s```)?/gms;

class MarkdownTestParser {
  static parse(file) {
    const scenarios = [];

    try {
      const content = fs.readFileSync(file, { encoding: "utf-8" });
      const lines = content.split("\n");

      let scenario;
      let parentScenarios = [];

      lines.forEach(line => {
        if (
          line.match(SCENARIO_TITLE_REGEX) ||
          (parentScenarios.length === 0 && line.match(CHILD_SCENARIO_TITLE_REGEX))
        ) {
          scenario = {
            title: line.replace(/#+\s+/, "").trim(),
            level: 1,
            content: "",
            children: []
          };
          scenarios.push(scenario);

          parentScenarios = [scenario];
        } else if (line.match(CHILD_SCENARIO_TITLE_REGEX)) {
          const level = line.match(/^#+/)[0].length;

          if (level > scenario.level) {
            parentScenarios.push(scenario);
          }

          let parent = parentScenarios[parentScenarios.length - 1];

          while (level <= parent.level) {
            parentScenarios.pop();
            parent = parentScenarios[parentScenarios.length - 1];
          }

          const childScenario = {
            title: line.replace(/#+\s+/, "").trim(),
            level: parent.level + 1,
            content: "",
            children: []
          };
          parent.children.push(childScenario);
          parentScenarios.push(childScenario);
          scenario = childScenario;
        } else {
          scenario.content += `${line}\n`;
        }
      });

      scenarios.forEach(parseTests);
    } catch (e) {
      throw new Error(`Error parsing file ${file}: ${e.message}`);
    }

    return scenarios;
  }
}

function parseTests(scenario) {
  const content = scenario.content;
  scenario.tests = [];

  const regex = new RegExp(TEST_REGEX);
  let match;

  while ((match = regex.exec(content)) !== null) {
    const test = {
      title: match.groups.title ? match.groups.title.trim() : undefined,
      execute: match.groups.execute ? match.groups.execute.trim() : undefined,
      expect: match.groups.expect ? match.groups.expect.trim() : undefined,
      error: match.groups.error ? match.groups.error.trim() : undefined
    };

    scenario.tests.push(test);
  }

  delete scenario.content;

  scenario.children.forEach(parseTests);
}

module.exports = MarkdownTestParser;
