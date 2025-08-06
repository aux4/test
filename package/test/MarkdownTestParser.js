const colors = require("colors");
const fs = require("fs");

const SCENARIO_TITLE_REGEX = /^#\s+.+$/g;
const CHILD_SCENARIO_TITLE_REGEX = /^#{2,6}\s+.+$/g;
const FILE_REGEX = /^```file:(?<file>[^\n]+)\n(?<content>.+?)\n```$/gms;
const BEFORE_EACH_REGEX = /^```beforeEach\n(?<cmd>.+?)\n```$/gms;
const AFTER_EACH_REGEX = /^```afterEach\n(?<cmd>.+?)\n```$/gms;
const BEFORE_ALL_REGEX = /^```beforeAll\n(?<cmd>.+?)\n```$/gms;
const AFTER_ALL_REGEX = /^```afterAll\n(?<cmd>.+?)\n```$/gms;
const EXECUTE_REGEX = /(^-\s(?<title>[^\n]+)\s+)?```execute\s*\n(?<execute>[^`]*?)\n```/gms;
const EXPECT_REGEX = /```expect(?<expectModifiers>:[^`\s]*)*\s*\n(?<expect>[^`]*?)\n```/gms;
const ERROR_REGEX = /```error(?<errorModifiers>:[^`\s]*)*\s*\n(?<error>[^`]*?)\n```/gms;

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

      scenarios.forEach(parse);
    } catch (e) {
      throw new Error(`Error parsing file ${file}: ${e.message}`);
    }

    return scenarios;
  }
}

function parse(scenario) {
  parseFiles(scenario);
  parseCommand(scenario, BEFORE_EACH_REGEX, "beforeEachCommands");
  parseCommand(scenario, AFTER_EACH_REGEX, "afterEachCommands");
  parseCommand(scenario, BEFORE_ALL_REGEX, "beforeAllCommands");
  parseCommand(scenario, AFTER_ALL_REGEX, "afterAllCommands");
  parseTests(scenario);
 
  delete scenario.content;
  scenario.children.forEach(parse);
}

function parseFiles(scenario) {
  const content = scenario.content;
  scenario.files = [];

  const regex = new RegExp(FILE_REGEX);
  let match;

  while ((match = regex.exec(content)) !== null) {
    const file = {
      name: match.groups.file.trim(),
      content: match.groups.content.trim()
    };

    scenario.files.push(file);
  }
}

function parseCommand(scenario, pattern, group) {
  const content = scenario.content;
  scenario[group] = [];

  const regex = new RegExp(pattern);
  let match;

  while ((match = regex.exec(content)) !== null) {
    const cmd = match.groups.cmd.trim();

    scenario[group].push(cmd);
  }
}

function parseTests(scenario) {
  const content = scenario.content;
  scenario.tests = [];

  const executeRegex = new RegExp(EXECUTE_REGEX);
  let executeMatch;

  while ((executeMatch = executeRegex.exec(content)) !== null) {
    const test = {
      title: executeMatch.groups.title ? executeMatch.groups.title.trim() : undefined,
      execute: executeMatch.groups.execute ? executeMatch.groups.execute.trim() : undefined,
      expects: [],
      errors: []
    };

    // Find the end position of the current execute block
    const executeEnd = executeMatch.index + executeMatch[0].length;
    
    // Find the start of the next execute block or end of content
    const nextExecuteMatch = executeRegex.exec(content);
    const searchEnd = nextExecuteMatch ? nextExecuteMatch.index : content.length;
    
    // Reset regex lastIndex to search from execute end
    executeRegex.lastIndex = executeMatch.index + executeMatch[0].length;
    
    // Search for expect blocks between current execute and next execute
    const expectRegex = new RegExp(EXPECT_REGEX);
    expectRegex.lastIndex = executeEnd;
    let expectMatch;
    
    while ((expectMatch = expectRegex.exec(content)) !== null && expectMatch.index < searchEnd) {
      const expectObj = {
        expect: expectMatch.groups.expect,
        expectIgnoreCase: false,
        expectPartial: false,
        expectRegex: false
      };
      
      // Parse expect modifiers
      if (expectMatch.groups.expectModifiers) {
        const modifiers = expectMatch.groups.expectModifiers.split(':').filter(m => m.length > 0);
        expectObj.expectIgnoreCase = modifiers.includes('ignoreCase');
        expectObj.expectPartial = modifiers.includes('partial');
        expectObj.expectRegex = modifiers.includes('regex');
      }
      
      test.expects.push(expectObj);
    }
    
    // Search for error blocks between current execute and next execute
    const errorRegex = new RegExp(ERROR_REGEX);
    errorRegex.lastIndex = executeEnd;
    let errorMatch;
    
    while ((errorMatch = errorRegex.exec(content)) !== null && errorMatch.index < searchEnd) {
      const errorObj = {
        error: errorMatch.groups.error,
        errorIgnoreCase: false,
        errorPartial: false,
        errorRegex: false
      };
      
      // Parse error modifiers
      if (errorMatch.groups.errorModifiers) {
        const modifiers = errorMatch.groups.errorModifiers.split(':').filter(m => m.length > 0);
        errorObj.errorIgnoreCase = modifiers.includes('ignoreCase');
        errorObj.errorPartial = modifiers.includes('partial');
        errorObj.errorRegex = modifiers.includes('regex');
      }
      
      test.errors.push(errorObj);
    }
    

    scenario.tests.push(test);
  }
}

module.exports = MarkdownTestParser;
