const colors = require("colors");
const fs = require("fs");

// Use marked library from node_modules
const { marked } = require("marked");

// The full set of `expect:`/`error:` comparison modifiers the engine understands.
// Any token in an `expect:<token>` suffix that is NOT in this list is treated as a
// custom block handler name (see `execute:<handler>` / `expect:<handler>` below),
// not a typo'd modifier. This is the one rule that decides "handler vs modifier" —
// keep it in sync with the modifiers actually implemented in aux4.test.js.
const KNOWN_EXPECT_MODIFIERS = ['ignoreCase', 'partial', 'regex', 'json', 'ai', 'score', 'similar'];

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
          // Store timeout for the next test, and use it as the scenario-level
          // budget for setup/teardown hooks (which otherwise get jest's default
          // 5s) and as the default for the scenario's tests.
          pendingTimeout = timeoutValue;
          scenario.timeout = timeoutValue;
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
    } else if (language === 'execute' || language.startsWith('execute:')) {
      // 'execute' runs the block as a shell command (unchanged, default behavior).
      // 'execute:<handler>' writes the block content to a temp file and runs a handler
      // command template over it, so a step can be authored in another language (e.g.
      // a playbook script) instead of shell. The handler is resolved at run time against
      // config key `block_<handler>` or a built-in default (see DEFAULT_BLOCK_HANDLERS in
      // aux4.test.js) — an undefined handler fails the test with a clear message rather
      // than silently doing nothing.
      const handler = language.startsWith('execute:') ? language.substring(8).trim() : '';
      currentTest = {
        title: undefined,
        execute: content,
        executeHandler: handler || undefined,
        expects: [],
        errors: [],
        timeout: pendingTimeout || undefined
      };
      scenario.tests.push(currentTest);
      pendingTimeout = null; // Clear pending timeout
    } else if (language.startsWith('expect')) {
      if (currentTest) {
        const modifiers = language.substring(6); // Remove 'expect'

        // `expect:<handler>` runs the block through a handler (e.g. playbook) and
        // passes/fails on its exit code, instead of comparing the block content to
        // stdout. Any suffix token that isn't a KNOWN_EXPECT_MODIFIER is treated as a
        // handler name — this is a parse-time decision based purely on the token, so a
        // typo'd modifier (e.g. `expect:partail`) is unambiguously a handler lookup
        // that fails loudly at run time, never a silently-ignored modifier.
        const suffixTokens = modifiers.split(':').map(m => m.trim()).filter(Boolean);
        const handlerTokens = suffixTokens.filter(m => !KNOWN_EXPECT_MODIFIERS.includes(m));

        const expectObj = {
          expect: content,
          expectHandler: handlerTokens.length === 1 ? handlerTokens[0] : undefined,
          expectIgnoreCase: modifiers.includes(':ignoreCase'),
          expectPartial: modifiers.includes(':partial'),
          expectRegex: modifiers.includes(':regex'),
          expectJson: modifiers.includes(':json'),
          expectAi: modifiers.includes(':ai'),
          expectScore: modifiers.includes(':score'),
          expectSimilar: modifiers.includes(':similar')
        };

        if (handlerTokens.length > 1) {
          expectObj.expectHandlerError =
            `Ambiguous expect block 'expect${modifiers}': '${handlerTokens.join("', '")}' are not recognized modifiers. ` +
            `Known modifiers are: ${KNOWN_EXPECT_MODIFIERS.join(', ')}. If one of these was meant to be a custom block ` +
            `handler, use a single unknown suffix, e.g. expect:${handlerTokens[0]}.`;
        }

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
