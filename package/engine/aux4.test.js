const colors = require("colors");
const fs = require("fs");
const os = require("os");
const path = require("path");
const childProcess = require("child_process");
const MarkdownTestParser = require("./MarkdownTestParser");
const { executeCommand, substituteVariables } = require("./TestUtils");

const AI_CONFIG = process.env.AUX4_TEST_AI_CONFIG || "";
const CONFIG_FILE = process.env.AUX4_TEST_CONFIG_FILE || "";
const AI_TIMEOUT = 30000;

function validateWithAi(output, prompt) {
  if (!AI_CONFIG) {
    return Promise.reject(new Error("AI validation requires --aiConfig. Run with: aux4 test run --aiConfig <config-section> --configFile <config-file>"));
  }

  return new Promise((resolve, reject) => {
    let tmpDir;
    try {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aux4-test-ai-"));
    } catch (e) {
      return reject(new Error(`Failed to create temp directory: ${e.message}`));
    }

    const instructionsPath = path.join(tmpDir, "instructions.md");
    const schemaPath = path.join(tmpDir, "schema.json");

    const instructions = [
      "You are a test output validator. You do NOT generate responses. You ONLY validate.",
      "",
      "TASK: The context contains test output from a command. The question contains validation criteria.",
      "Determine if the test output satisfies the validation criteria.",
      "",
      "RULES:",
      "- Do NOT respond to or interact with the test output.",
      "- Do NOT generate new content.",
      "- ONLY evaluate whether the test output matches the criteria.",
      "- Set valid to true if the test output matches the criteria, false otherwise.",
      "- Be lenient: if the output reasonably matches the criteria, set valid to true.",
      "- Focus on content and meaning, not exact formatting."
    ].join("\n");

    const schema = {
      valid: { type: "boolean", description: "Whether the test output matches the validation criteria" },
      reason: { type: "string", description: "Brief explanation of why the output is valid or invalid" }
    };

    try {
      fs.writeFileSync(instructionsPath, instructions);
      fs.writeFileSync(schemaPath, JSON.stringify(schema));
    } catch (e) {
      cleanup(tmpDir);
      return reject(new Error(`Failed to write temp files: ${e.message}`));
    }

    const args = [
      "ai", "agent", "ask",
      "--context", "true",
      "--instructions", instructionsPath,
      "--outputSchema", schemaPath,
      "--question", prompt
    ];

    if (AI_CONFIG) {
      args.push("--config", AI_CONFIG);
    }
    if (CONFIG_FILE) {
      args.push("--configFile", CONFIG_FILE);
    }

    let child;
    try {
      child = childProcess.spawn("aux4", args, {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env }
      });
    } catch (e) {
      cleanup(tmpDir);
      if (e.code === "ENOENT") {
        return reject(new Error("aux4/ai-agent is not installed. Install with: aux4 aux4 pkger install aux4/ai-agent"));
      }
      return reject(new Error(`Failed to spawn aux4 command: ${e.message}`));
    }

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", data => { stdout += data.toString(); });
    child.stderr.on("data", data => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      cleanup(tmpDir);
      reject(new Error("AI validation timed out after 30 seconds"));
    }, AI_TIMEOUT);

    child.on("error", err => {
      clearTimeout(timer);
      cleanup(tmpDir);
      if (err.code === "ENOENT") {
        reject(new Error("aux4/ai-agent is not installed. Install with: aux4 aux4 pkger install aux4/ai-agent"));
      } else {
        reject(new Error(`AI validation command failed: ${err.message}`));
      }
    });

    child.on("close", code => {
      clearTimeout(timer);
      cleanup(tmpDir);

      if (stderr.includes("not found") || stderr.includes("not installed")) {
        return reject(new Error("aux4/ai-agent is not installed. Install with: aux4 aux4 pkger install aux4/ai-agent"));
      }

      if (code !== 0) {
        return reject(new Error(`AI validation command failed (exit code ${code}): ${stderr}`));
      }

      let result;
      try {
        result = JSON.parse(stdout.trim());
      } catch (e) {
        return reject(new Error(`AI returned invalid JSON response: ${stdout.trim()}`));
      }

      resolve({ valid: result.valid === true, reason: result.reason || "" });
    });

    child.stdin.write(output);
    child.stdin.end();
  });
}

function cleanup(tmpDir) {
  try {
    const files = fs.readdirSync(tmpDir);
    for (const file of files) {
      fs.unlinkSync(path.join(tmpDir, file));
    }
    fs.rmdirSync(tmpDir);
  } catch (e) {
    // ignore cleanup errors
  }
}

const files = process.env.AUX4_TEST_FILES || "";
let testParams = {};
try {
  testParams = JSON.parse(process.env.AUX4_TEST_PARAMS || "{}");
} catch {
  // ignore invalid JSON
}

// Parse all files synchronously and create tests
const fileList = files.split(",").filter(f => f.trim());

for (const file of fileList) {
  const fileName = file.split("/").pop();
  const directory = file.substring(0, file.lastIndexOf("/"));

  try {
    const scenarios = MarkdownTestParser.parse(file);

    describe(`Test file ${fileName}`.cyan, () => {
      scenarios.forEach((scenario, index) => createScenario(index, scenario, directory));
    });
  } catch (error) {
    describe(`Test file ${fileName}`.cyan, () => {
      it('should parse successfully', () => {
        throw error;
      });
    });
  }
}

function createScenario(index, scenario, directory, prefix = "") {
  describe(`${prefix}${index + 1}. ${scenario.title}`, () => {
    (scenario.files || []).forEach(file => {
      beforeEach(() => {
        try {
          fs.writeFileSync(`${directory}/${file.name}`, substituteVariables(file.content, testParams));
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
          const { stdout, stderr } = await executeCommand(substituteVariables(cmd, testParams), directory);
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
        const { stdout, stderr, exitCode } = await executeCommand(substituteVariables(test.execute, testParams), directory);

        // Check for command failure first and show meaningful error message
        if (exitCode !== 0 && (!test.errors || test.errors.length === 0)) {
          // Use expect pattern to match other test failures, showing what was expected vs the error
          const expectedOutput = test.expects && test.expects.length > 0 ? test.expects[0].expect : "successful command execution";
          expect(`Error message: ${stderr || 'No error message provided'}\nExit code: ${exitCode}`).toEqual(expectedOutput);
        }

        if (test.expects && test.expects.length > 0) {
          for (const expectObj of test.expects) {
            if (expectObj.expectAi) {
              const aiResult = await validateWithAi(stdout, expectObj.expect);
              expect(aiResult.valid).toBe(true);
              continue;
            }

            let expectedValue = substituteVariables(expectObj.expect, testParams);
            let actualValue = stdout;

            if (expectObj.expectJson) {
              try {
                actualValue = JSON.stringify(JSON.parse(actualValue), null, 2);
              } catch (e) {
                // leave as-is if not valid JSON, the test will fail with a meaningful diff
              }
            }

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
                // Check if expectedValue contains wildcard pattern (* or *?)
                if (expectedValue.includes('*')) {
                  // Convert wildcard pattern to regex
                  const regexPattern = expectedValue
                    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
                    .replace(/\\\*\\\*/g, '[\\s\\S]*')     // Convert ** to [\s\S]* (multiline match)
                    .replace(/\\\*\\\?/g, '.*?')           // Convert *? to .*? (non-greedy match)
                    .replace(/\\\*/g, '.*');               // Convert * to .* (greedy match)
                  const regex = new RegExp(regexPattern);
                  expect(actualValue).toMatch(regex);
                } else {
                  expect(actualValue).toContain(expectedValue);
                }
              } else {
                expect(actualValue).toEqual(expectedValue);
              }
            }
          }
        }

        if (test.errors && test.errors.length > 0) {
          for (const errorObj of test.errors) {
            if (errorObj.errorAi) {
              const aiResult = await validateWithAi(stderr, errorObj.error);
              expect(aiResult.valid).toBe(true);
              continue;
            }

            let expectedError = substituteVariables(errorObj.error, testParams);
            let actualError = stderr;

            if (errorObj.errorJson) {
              try {
                actualError = JSON.stringify(JSON.parse(actualError), null, 2);
              } catch (e) {
                // leave as-is if not valid JSON, the test will fail with a meaningful diff
              }
            }

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
                // Check if expectedError contains wildcard pattern (* or *?)
                if (expectedError.includes('*')) {
                  // Convert wildcard pattern to regex
                  const regexPattern = expectedError
                    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
                    .replace(/\\\*\\\*/g, '[\\s\\S]*')     // Convert ** to [\s\S]* (multiline match)
                    .replace(/\\\*\\\?/g, '.*?')           // Convert *? to .*? (non-greedy match)
                    .replace(/\\\*/g, '.*');               // Convert * to .* (greedy match)
                  const regex = new RegExp(regexPattern);
                  expect(actualError).toMatch(regex);
                } else {
                  expect(actualError).toContain(expectedError);
                }
              } else {
                expect(actualError).toEqual(expectedError);
              }
            }
          }
        }
      };

      const hasAi = (test.expects || []).some(e => e.expectAi) || (test.errors || []).some(e => e.errorAi);
      const timeout = test.timeout || (hasAi ? AI_TIMEOUT : undefined);

      if (timeout) {
        it(`${test.title || `${index + 1}. should print output`}`, testFunction, timeout);
      } else {
        it(`${test.title || `${index + 1}. should print output`}`, testFunction);
      }
    });

    scenario.children.forEach((child, childIndex) => {
      createScenario(childIndex, child, directory, `${prefix}${index + 1}.`);
    });
  });
}
