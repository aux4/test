const colors = require("colors");
const fs = require("fs");

// Use marked library from node_modules
const { marked } = require("marked");

class MarkdownTestParser {
  static parse(file) {
    const scenarios = [];

    try {
      const content = fs.readFileSync(file, { encoding: "utf-8" });

      // Use marked to parse the entire document
      const tokens = marked.lexer(content);

      let scenario = null;
      let parentScenarios = [];
      let currentContent = "";

      tokens.forEach(token => {
        if (token.type === 'heading') {
          // Save current content to previous scenario if exists
          if (scenario) {
            scenario.content = currentContent;
            currentContent = "";
          }

          const level = token.depth;
          const title = token.text;

          if (level === 1 || parentScenarios.length === 0) {
            // Main scenario
            scenario = {
              title: title,
              level: 1,
              content: "",
              children: []
            };
            scenarios.push(scenario);
            parentScenarios = [scenario];
          } else {
            // Child scenario
            // Find the correct parent level
            while (parentScenarios.length > 0 && level <= parentScenarios[parentScenarios.length - 1].level) {
              parentScenarios.pop();
            }

            const parent = parentScenarios[parentScenarios.length - 1] || scenarios[scenarios.length - 1];
            const childScenario = {
              title: title,
              level: parent.level + 1,
              content: "",
              children: []
            };

            parent.children.push(childScenario);
            parentScenarios.push(childScenario);
            scenario = childScenario;
          }
        } else {
          // Accumulate content for current scenario
          if (token.raw) {
            currentContent += token.raw;
          }
        }
      });

      // Save content for the last scenario
      if (scenario) {
        scenario.content = currentContent;
      }

      for (const scenario of scenarios) {
        parse(scenario);
      }
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
    parseWithMarked(scenario);
  } catch (error) {
    console.error(`Error parsing scenario "${scenario.title}": ${error.message}`);
    // Set empty arrays as fallbacks
    scenario.files = [];
    scenario.beforeEachCommands = [];
    scenario.afterEachCommands = [];
    scenario.beforeAllCommands = [];
    scenario.afterAllCommands = [];
    scenario.tests = [];
  }

  delete scenario.content;
  for (const child of scenario.children) {
    parse(child);
  }
}

function parseWithMarked(scenario) {
  // Initialize arrays
  scenario.files = [];
  scenario.beforeEachCommands = [];
  scenario.afterEachCommands = [];
  scenario.beforeAllCommands = [];
  scenario.afterAllCommands = [];
  scenario.tests = [];

  // Use marked to tokenize the content
  const tokens = marked.lexer(scenario.content);

  // Filter for code blocks
  const codeBlocks = tokens.filter(token => token.type === 'code');

  let currentTest = null;
  let pendingTimeout = null;

  codeBlocks.forEach(block => {
    const language = block.lang || '';
    const content = block.text;

    if (language.startsWith('file:')) {
      const filename = language.substring(5).trim();
      scenario.files.push({
        name: filename,
        content: content
      });
    } else if (language === 'beforeEach') {
      scenario.beforeEachCommands.push(content);
    } else if (language === 'afterEach') {
      scenario.afterEachCommands.push(content);
    } else if (language === 'beforeAll') {
      scenario.beforeAllCommands.push(content);
    } else if (language === 'afterAll') {
      scenario.afterAllCommands.push(content);
    } else if (language === 'timeout') {
      const timeoutValue = parseInt(content.trim(), 10);
      if (!isNaN(timeoutValue)) {
        if (currentTest) {
          // Apply timeout to current test
          currentTest.timeout = timeoutValue;
        } else {
          // Store timeout for next test
          pendingTimeout = timeoutValue;
        }
      }
    } else if (language === 'dataset' || language.startsWith('dataset:')) {
      // Dataset block: inline JSON array or config with file reference
      if (language.startsWith('dataset:')) {
        // dataset:file.json syntax — file path directly in the language tag
        const filePath = language.substring(8).trim();
        scenario.dataset = { file: filePath };
      } else {
        // Inline dataset block — parse key-value config
        const config = parseKeyValueBlock(content);
        scenario.dataset = {};
        if (config.file) scenario.dataset.file = config.file;
        if (config.root) scenario.dataset.root = config.root;
        if (config.key) scenario.dataset.key = config.key;
      }
    } else if (language === 'execute') {
      // Start a new test
      currentTest = {
        title: undefined,
        execute: content,
        expects: [],
        errors: [],
        timeout: pendingTimeout || undefined
      };
      scenario.tests.push(currentTest);
      pendingTimeout = null; // Clear pending timeout
    } else if (language.startsWith('expect')) {
      if (currentTest) {
        const modifiers = language.substring(6); // Remove 'expect'
        const expectObj = {
          expect: content,
          expectIgnoreCase: modifiers.includes(':ignoreCase'),
          expectPartial: modifiers.includes(':partial'),
          expectRegex: modifiers.includes(':regex'),
          expectJson: modifiers.includes(':json'),
          expectAi: modifiers.includes(':ai'),
          expectScore: modifiers.includes(':score'),
          expectSimilar: modifiers.includes(':similar')
        };

        // Parse expect:ai:score block fields: name, eval, range, pass
        if (expectObj.expectScore) {
          const parsed = parseKeyValueBlock(content);
          expectObj.scoreName = parsed.name || '';
          expectObj.scoreEval = parsed.eval || '';
          expectObj.scoreRange = parseRange(parsed.range || '1-5');
          expectObj.scorePass = parseFloat(parsed.pass) || 3;
        }

        // Parse expect:similar block fields: name, metric, pass, file, content (below ---)
        if (expectObj.expectSimilar) {
          const { config, content: refContent } = parseSimilarBlock(content);
          expectObj.similarName = config.name || '';
          expectObj.similarMetric = config.metric || 'fuzzy'; // default: fuzzy (Levenshtein ratio)
          expectObj.similarPass = parseFloat(config.pass) || 0.8;
          expectObj.similarFile = config.file || '';
          expectObj.similarContent = refContent;
        }

        currentTest.expects.push(expectObj);
      }
    } else if (language.startsWith('error')) {
      if (currentTest) {
        const modifiers = language.substring(5); // Remove 'error'
        const errorObj = {
          error: content,
          errorIgnoreCase: modifiers.includes(':ignoreCase'),
          errorPartial: modifiers.includes(':partial'),
          errorRegex: modifiers.includes(':regex'),
          errorJson: modifiers.includes(':json'),
          errorAi: modifiers.includes(':ai')
        };
        currentTest.errors.push(errorObj);
      }
    }
  });
}


function parseKeyValueBlock(content) {
  const result = {};
  for (const line of content.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && value) result[key] = value;
  }
  return result;
}

function parseRange(rangeStr) {
  const parts = rangeStr.split('-').map(s => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { min: parts[0], max: parts[1] };
  }
  return { min: 1, max: 5 };
}

function parseSimilarBlock(content) {
  const separatorIndex = content.indexOf('\n---\n');
  if (separatorIndex !== -1) {
    const configSection = content.slice(0, separatorIndex);
    const refContent = content.slice(separatorIndex + 5); // skip \n---\n
    return { config: parseKeyValueBlock(configSection), content: refContent };
  }
  // No separator — all config, no inline content
  return { config: parseKeyValueBlock(content), content: '' };
}

module.exports = MarkdownTestParser;
