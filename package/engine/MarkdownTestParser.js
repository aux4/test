const colors = require("colors");
const fs = require("fs");

const SCENARIO_TITLE_REGEX = /^#\s+.+$/g;
const CHILD_SCENARIO_TITLE_REGEX = /^#{2,6}\s+.+$/g;
const FILE_REGEX = /^(`{3,})file:(?<file>[^\n]+)\n(?<content>[\s\S]*?)\n\1$/gms;
const BEFORE_EACH_REGEX = /^(`{3,})beforeEach\n(?<cmd>[\s\S]*?)\n\1$/gms;
const AFTER_EACH_REGEX = /^(`{3,})afterEach\n(?<cmd>[\s\S]*?)\n\1$/gms;
const BEFORE_ALL_REGEX = /^(`{3,})beforeAll\n(?<cmd>[\s\S]*?)\n\1$/gms;
const AFTER_ALL_REGEX = /^(`{3,})afterAll\n(?<cmd>[\s\S]*?)\n\1$/gms;
const EXECUTE_REGEX = /(^-\s(?<title>[^\n]+)\s+)?(`{3,})execute\s*\n(?<execute>[\s\S]*?)\n\2/gms;
const EXPECT_REGEX = /(`{3,})expect(?<expectModifiers>:[^`\s]*)*\s*\n(?<expect>[\s\S]*?)\n\1/gms;
const ERROR_REGEX = /(`{3,})error(?<errorModifiers>:[^`\s]*)*\s*\n(?<error>[\s\S]*?)\n\1/gms;
const TIMEOUT_REGEX = /^(`{3,})timeout\s*\n(?<timeout>[\s\S]*?)\n\1$/gms;

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
      // Provide helpful error messages for common issues
      let helpfulMessage = e.message;

      if (e.message.includes("Cannot read properties of undefined")) {
        if (e.message.includes("content")) {
          helpfulMessage = `Malformed file block found. Check that all file blocks have proper opening and closing backticks.\n` +
                          `Example: \`\`\`file:filename.txt\ncontent here\n\`\`\``;
        } else if (e.message.includes("groups")) {
          helpfulMessage = `Regex pattern matching failed. This might be due to malformed markdown blocks.`;
        }
      } else if (e.message.includes("no such file or directory")) {
        helpfulMessage = `Test file "${file}" not found. Check the file path is correct.`;
      } else if (scenarios.length === 0) {
        helpfulMessage = `No valid test scenarios found. Make sure the file starts with a main heading (# Title) and contains valid test blocks.`;
      }

      console.error(`\n❌ Error parsing test file: ${file}`);
      console.error(`📋 Issue: ${helpfulMessage}`);
      console.error(`🔧 This file will be skipped, but other tests will continue.\n`);

      // Return empty scenarios array instead of throwing, so other files can still be tested
      return [];
    }

    return scenarios;
  }
}

function parse(scenario) {
  try {
    parseFiles(scenario);
  } catch (error) {
    console.error(`Error parsing file blocks in scenario "${scenario.title}": ${error.message}`);
    scenario.files = []; // Set empty array as fallback
  }

  try {
    parseCommand(scenario, BEFORE_EACH_REGEX, "beforeEachCommands");
  } catch (error) {
    console.error(`Error parsing beforeEach commands in scenario "${scenario.title}": ${error.message}`);
    scenario.beforeEachCommands = [];
  }

  try {
    parseCommand(scenario, AFTER_EACH_REGEX, "afterEachCommands");
  } catch (error) {
    console.error(`Error parsing afterEach commands in scenario "${scenario.title}": ${error.message}`);
    scenario.afterEachCommands = [];
  }

  try {
    parseCommand(scenario, BEFORE_ALL_REGEX, "beforeAllCommands");
  } catch (error) {
    console.error(`Error parsing beforeAll commands in scenario "${scenario.title}": ${error.message}`);
    scenario.beforeAllCommands = [];
  }

  try {
    parseCommand(scenario, AFTER_ALL_REGEX, "afterAllCommands");
  } catch (error) {
    console.error(`Error parsing afterAll commands in scenario "${scenario.title}": ${error.message}`);
    scenario.afterAllCommands = [];
  }

  try {
    parseTests(scenario);
  } catch (error) {
    console.error(`Error parsing tests in scenario "${scenario.title}": ${error.message}`);
    scenario.tests = []; // Set empty array as fallback
  }

  delete scenario.content;
  scenario.children.forEach(parse);
}

function parseFiles(scenario) {
  const content = scenario.content;
  scenario.files = [];

  const regex = new RegExp(FILE_REGEX);
  let match;

  while ((match = regex.exec(content)) !== null) {
    try {
      if (!match.groups) {
        console.warn(`Warning: File regex matched but no groups found in scenario "${scenario.title}"`);
        continue;
      }

      if (!match.groups.file) {
        console.warn(`Warning: File regex matched but no filename found in scenario "${scenario.title}"`);
        continue;
      }

      if (match.groups.content === undefined) {
        console.warn(`Warning: File regex matched but no content found for file "${match.groups.file}" in scenario "${scenario.title}"`);
        // Allow empty content
        match.groups.content = "";
      }

      const file = {
        name: match.groups.file.trim(),
        content: match.groups.content.trim()
      };

      scenario.files.push(file);
    } catch (error) {
      console.error(`Error parsing file block in scenario "${scenario.title}": ${error.message}`);
      console.error(`Problematic match:`, match);
      // Continue parsing other files instead of failing entirely
    }
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
      title: executeMatch.groups && executeMatch.groups.title ? executeMatch.groups.title.trim() : undefined,
      execute: executeMatch.groups && executeMatch.groups.execute ? executeMatch.groups.execute.trim() : undefined,
      expects: [],
      errors: [],
      timeout: undefined
    };

    // Find the start and end positions for searching related blocks
    const executeStart = executeMatch.index;
    const executeEnd = executeMatch.index + executeMatch[0].length;

    // Find the start of the next execute block or end of content
    const nextExecuteMatch = executeRegex.exec(content);
    const searchEnd = nextExecuteMatch ? nextExecuteMatch.index : content.length;

    // Find the start of the previous execute block or beginning of content
    const prevExecuteRegex = new RegExp(EXECUTE_REGEX);
    let prevExecuteEnd = 0;
    let prevMatch;
    while ((prevMatch = prevExecuteRegex.exec(content)) !== null && prevMatch.index < executeStart) {
      prevExecuteEnd = prevMatch.index + prevMatch[0].length;
    }
    const searchStart = prevExecuteEnd;

    // Reset regex lastIndex to search from execute end
    executeRegex.lastIndex = executeMatch.index + executeMatch[0].length;
    
    // Search for expect blocks between current execute and next execute
    const expectRegex = new RegExp(EXPECT_REGEX);
    expectRegex.lastIndex = executeEnd;
    let expectMatch;
    
    while ((expectMatch = expectRegex.exec(content)) !== null && expectMatch.index < searchEnd) {
      const expectObj = {
        expect: expectMatch.groups && expectMatch.groups.expect ? expectMatch.groups.expect : "",
        expectIgnoreCase: false,
        expectPartial: false,
        expectRegex: false
      };
      
      // Parse expect modifiers
      if (expectMatch.groups && expectMatch.groups.expectModifiers) {
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
        error: errorMatch.groups && errorMatch.groups.error ? errorMatch.groups.error : "",
        errorIgnoreCase: false,
        errorPartial: false,
        errorRegex: false
      };

      // Parse error modifiers
      if (errorMatch.groups && errorMatch.groups.errorModifiers) {
        const modifiers = errorMatch.groups.errorModifiers.split(':').filter(m => m.length > 0);
        errorObj.errorIgnoreCase = modifiers.includes('ignoreCase');
        errorObj.errorPartial = modifiers.includes('partial');
        errorObj.errorRegex = modifiers.includes('regex');
      }
      
      test.errors.push(errorObj);
    }

    // Search for timeout blocks in the range around the current execute block
    const timeoutRegex = new RegExp(TIMEOUT_REGEX);
    timeoutRegex.lastIndex = 0;
    let timeoutMatch;

    while ((timeoutMatch = timeoutRegex.exec(content)) !== null) {
      // Check if timeout is in the range for this execute block
      if (timeoutMatch.index >= searchStart && timeoutMatch.index < searchEnd) {
        const timeoutValue = parseInt(timeoutMatch.groups.timeout.trim(), 10);
        if (!isNaN(timeoutValue)) {
          test.timeout = timeoutValue;
          break; // Only use the first timeout block found
        }
      }
    }

    scenario.tests.push(test);
  }
}

module.exports = MarkdownTestParser;
