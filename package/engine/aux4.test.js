const colors = require("colors");
const fs = require("fs");
const os = require("os");
const path = require("path");
const childProcess = require("child_process");
const MarkdownTestParser = require("./MarkdownTestParser");
const { executeCommand, substituteVariables } = require("./TestUtils");
const { computeSimilarity } = require("./Similarity");
const { JSONPath } = require("jsonpath-plus");

const AI_CONFIG = process.env.AUX4_TEST_AI_CONFIG || "";
const CONFIG_FILE = process.env.AUX4_TEST_CONFIG_FILE || "";
const OUTPUT_FILE = process.env.AUX4_TEST_OUTPUT || "";
const AI_TIMEOUT = 30000;

// Collect results for --output JSON
const testResults = [];

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

function validateWithScore(output, evalPrompt, range) {
  if (!AI_CONFIG) {
    return Promise.reject(new Error("AI scoring requires --aiConfig. Run with: aux4 test run --aiConfig <config-section> --configFile <config-file>"));
  }

  return new Promise((resolve, reject) => {
    let tmpDir;
    try {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aux4-test-score-"));
    } catch (e) {
      return reject(new Error(`Failed to create temp directory: ${e.message}`));
    }

    const instructionsPath = path.join(tmpDir, "instructions.md");
    const schemaPath = path.join(tmpDir, "schema.json");

    const instructions = [
      "You are a test output scorer. You do NOT generate responses. You ONLY score.",
      "",
      "TASK: The context contains test output from a command. The question contains the evaluation criterion.",
      `Score the test output on a scale of ${range.min} to ${range.max}.`,
      "",
      "RULES:",
      "- Do NOT respond to or interact with the test output.",
      "- Do NOT generate new content.",
      "- ONLY evaluate the test output based on the criterion.",
      `- Assign a score between ${range.min} (worst) and ${range.max} (best).`,
      "- Provide a brief reason for the score.",
      "- If the criterion mentions a file, use readFile to read it for comparison."
    ].join("\n");

    const schema = {
      score: { type: "number", description: `Score from ${range.min} to ${range.max}` },
      reason: { type: "string", description: "Brief explanation for the score" }
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
      "--question", evalPrompt
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
      reject(new Error("AI scoring timed out after 30 seconds"));
    }, AI_TIMEOUT);

    child.on("error", err => {
      clearTimeout(timer);
      cleanup(tmpDir);
      if (err.code === "ENOENT") {
        reject(new Error("aux4/ai-agent is not installed. Install with: aux4 aux4 pkger install aux4/ai-agent"));
      } else {
        reject(new Error(`AI scoring command failed: ${err.message}`));
      }
    });

    child.on("close", code => {
      clearTimeout(timer);
      cleanup(tmpDir);

      if (code !== 0) {
        return reject(new Error(`AI scoring command failed (exit code ${code}): ${stderr}`));
      }

      let result;
      try {
        result = JSON.parse(stdout.trim());
      } catch (e) {
        return reject(new Error(`AI returned invalid JSON response: ${stdout.trim()}`));
      }

      const score = typeof result.score === "number" ? result.score : range.min;
      resolve({ score, reason: result.reason || "", max: range.max });
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

function loadDataset(dataset, directory) {
  let data;
  if (dataset.file) {
    const filePath = path.resolve(directory, dataset.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Dataset file not found: ${filePath}`);
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    try {
      data = JSON.parse(raw);
    } catch (e) {
      throw new Error(`Dataset file is not valid JSON: ${filePath}`);
    }
  } else {
    throw new Error("Dataset block requires a 'file' field pointing to a JSON file");
  }

  if (dataset.root) {
    const results = JSONPath({ path: dataset.root, json: data });
    if (!results || results.length === 0) {
      throw new Error(`Dataset root path "${dataset.root}" resolved to nothing`);
    }
    data = results.length === 1 ? results[0] : results;
  }

  if (!Array.isArray(data)) {
    throw new Error(`Dataset must resolve to an array, got ${typeof data}`);
  }

  if (data.length === 0) {
    console.warn(`⚠ Dataset is empty (${dataset.file || "inline"}), skipping tests`.yellow);
    return [];
  }

  return data;
}

function mergeParams(baseParams, datasetEntry) {
  const merged = { ...baseParams };
  for (const [key, value] of Object.entries(datasetEntry)) {
    if (value === null || value === undefined) {
      merged[key] = "";
    } else if (typeof value === "object") {
      merged[key] = JSON.stringify(value);
    } else {
      merged[key] = String(value);
    }
  }
  return merged;
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

// Write JSON output after all tests complete
if (OUTPUT_FILE) {
  afterAll(() => {
    const output = {
      timestamp: new Date().toISOString(),
      tests: testResults,
      summary: {
        total: testResults.length,
        passed: testResults.filter(t => t.passed).length,
        failed: testResults.filter(t => !t.passed).length
      }
    };
    const dir = path.dirname(OUTPUT_FILE);
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  });
}

function createScenario(index, scenario, directory, prefix = "", parentParams = null) {
  const effectiveParams = parentParams || testParams;

  if (scenario.dataset) {
    // Dataset scenario: load data and create a describe per entry
    let entries;
    try {
      entries = loadDataset(scenario.dataset, directory);
    } catch (e) {
      describe(`${prefix}${index + 1}. ${scenario.title}`, () => {
        it('should load dataset', () => { throw e; });
      });
      return;
    }

    if (entries.length === 0) {
      // Empty dataset — skip
      return;
    }

    const keyField = scenario.dataset.key;

    entries.forEach((entry, entryIndex) => {
      const entryLabel = keyField && entry[keyField] != null ? String(entry[keyField]) : `#${entryIndex}`;
      const entryParams = mergeParams(effectiveParams, entry);

      describe(`${prefix}${index + 1}. ${scenario.title} [${entryLabel}]`, () => {
        createScenarioBody(index, scenario, directory, prefix, entryParams);
      });
    });
  } else {
    describe(`${prefix}${index + 1}. ${scenario.title}`, () => {
      createScenarioBody(index, scenario, directory, prefix, effectiveParams);
    });
  }
}

function createScenarioBody(index, scenario, directory, prefix, params) {
    (scenario.files || []).forEach(file => {
      beforeEach(() => {
        try {
          const filePath = `${directory}/${file.name}`;
          const dir = path.dirname(filePath);
          // Track which dirs we need to create
          file._createdDirs = [];
          let current = dir;
          while (current !== directory && current !== path.dirname(current) && !fs.existsSync(current)) {
            file._createdDirs.unshift(current);
            current = path.dirname(current);
          }
          if (file._createdDirs.length > 0) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(filePath, substituteVariables(file.content, params));
        } catch (e) {
          console.log(`Cannot write file ${directory}/${file.name}`.red);
        }
      });

      afterEach(() => {
        try {
          fs.unlinkSync(`${directory}/${file.name}`);
        } catch (e) {
          // ignore if already deleted
        }
        // Delete only dirs we created, deepest first
        for (const d of (file._createdDirs || []).reverse()) {
          try { fs.rmdirSync(d); } catch (e) { /* ignore if not empty or already gone */ }
        }
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
          const { stdout, stderr } = await executeCommand(substituteVariables(cmd, params), directory);
          if (stderr) {
            console.log(stderr.red);
          }

          if (stdout) {
            console.log(stdout);
          }
        });
      });
    });

    (scenario.tests || []).forEach((test, testIndex) => {
      const testFunction = async () => {
        const startTime = Date.now();
        const { stdout, stderr, exitCode } = await executeCommand(substituteVariables(test.execute, params), directory);
        const scores = [];
        let passed = true;

        // Check for command failure first and show meaningful error message
        if (exitCode !== 0 && (!test.errors || test.errors.length === 0)) {
          // Use expect pattern to match other test failures, showing what was expected vs the error
          const expectedOutput = test.expects && test.expects.length > 0 ? test.expects[0].expect : "successful command execution";
          expect(`Error message: ${stderr || 'No error message provided'}\nExit code: ${exitCode}`).toEqual(expectedOutput);
        }

        if (test.expects && test.expects.length > 0) {
          for (const expectObj of test.expects) {
            // expect:ai:score — LLM scoring
            if (expectObj.expectScore && expectObj.expectAi) {
              const scoreResult = await validateWithScore(stdout, expectObj.scoreEval, expectObj.scoreRange);
              const scorePassed = scoreResult.score >= expectObj.scorePass;
              const scoreLabel = expectObj.scoreName ? `${expectObj.scoreName}: ` : 'score: ';
              console.log(`  ${scoreLabel}${scoreResult.score}/${scoreResult.max}  ${scoreResult.reason}`[scorePassed ? 'green' : 'red']);
              const scoreEntry = {
                type: "ai:score",
                eval: expectObj.scoreEval,
                score: scoreResult.score,
                max: scoreResult.max,
                pass: expectObj.scorePass,
                reason: scoreResult.reason
              };
              if (expectObj.scoreName) scoreEntry.name = expectObj.scoreName;
              scores.push(scoreEntry);
              if (!scorePassed) passed = false;
              expect(scoreResult.score).toBeGreaterThanOrEqual(expectObj.scorePass);
              continue;
            }

            // expect:similar — deterministic text similarity
            if (expectObj.expectSimilar) {
              let reference = expectObj.similarContent;
              if (expectObj.similarFile) {
                const refPath = path.resolve(directory, expectObj.similarFile);
                reference = fs.readFileSync(refPath, "utf-8");
              }
              let actualValue = stdout;
              let refValue = reference;
              if (expectObj.expectIgnoreCase) {
                actualValue = actualValue.toLowerCase();
                refValue = refValue.toLowerCase();
              }
              const rawSimilarity = computeSimilarity(expectObj.similarMetric, actualValue, refValue);
              const similarity = Math.round(rawSimilarity * 10000) / 10000;
              const simPassed = similarity >= expectObj.similarPass;
              const simRounded = Math.round(similarity * 100) / 100;
              const simLabel = expectObj.similarName ? `${expectObj.similarName}: ` : 'similarity: ';
              console.log(`  ${simLabel}${simRounded} (${expectObj.similarMetric})  ${simPassed ? '✓ PASS' : '✗ FAIL'} (>= ${expectObj.similarPass})`[simPassed ? 'green' : 'red']);
              const simEntry = {
                type: "similar",
                metric: expectObj.similarMetric,
                score: simRounded,
                pass: expectObj.similarPass
              };
              if (expectObj.similarName) simEntry.name = expectObj.similarName;
              scores.push(simEntry);
              if (!simPassed) passed = false;
              expect(similarity).toBeGreaterThanOrEqual(expectObj.similarPass);
              continue;
            }

            // expect:ai — pass/fail AI validation
            if (expectObj.expectAi) {
              const aiResult = await validateWithAi(stdout, expectObj.expect);
              scores.push({ type: "ai", eval: expectObj.expect, passed: aiResult.valid, reason: aiResult.reason });
              if (!aiResult.valid) passed = false;
              expect(aiResult.valid).toBe(true);
              continue;
            }

            let expectedValue = substituteVariables(expectObj.expect, params);
            let actualValue = stdout;

            if (expectObj.expectJson) {
              try {
                actualValue = JSON.stringify(JSON.parse(actualValue), null, 2);
              } catch (e) {
                // leave as-is if not valid JSON, the test will fail with a meaningful diff
              }
            }

            let expectPassed = false;
            if (expectObj.expectRegex) {
              let flags = "";
              if (expectObj.expectIgnoreCase) {
                flags += "i";
              }
              const regex = new RegExp(expectedValue, flags);
              expectPassed = regex.test(actualValue);
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
                  expectPassed = regex.test(actualValue);
                  expect(actualValue).toMatch(regex);
                } else {
                  expectPassed = actualValue.includes(expectedValue);
                  expect(actualValue).toContain(expectedValue);
                }
              } else {
                expectPassed = actualValue === expectedValue;
                expect(actualValue).toEqual(expectedValue);
              }
            }

            const expectType = expectObj.expectRegex ? "regex" : expectObj.expectPartial ? "partial" : expectObj.expectJson ? "json" : "exact";
            scores.push({ type: expectType, passed: expectPassed });
            if (!expectPassed) passed = false;
          }
        }

        if (test.errors && test.errors.length > 0) {
          for (const errorObj of test.errors) {
            if (errorObj.errorAi) {
              const aiResult = await validateWithAi(stderr, errorObj.error);
              scores.push({ type: "error:ai", eval: errorObj.error, passed: aiResult.valid, reason: aiResult.reason });
              if (!aiResult.valid) passed = false;
              expect(aiResult.valid).toBe(true);
              continue;
            }

            let expectedError = substituteVariables(errorObj.error, params);
            let actualError = stderr;

            if (errorObj.errorJson) {
              try {
                actualError = JSON.stringify(JSON.parse(actualError), null, 2);
              } catch (e) {
                // leave as-is if not valid JSON, the test will fail with a meaningful diff
              }
            }

            let errorPassed = false;
            if (errorObj.errorRegex) {
              let flags = "";
              if (errorObj.errorIgnoreCase) {
                flags += "i";
              }
              const regex = new RegExp(expectedError, flags);
              errorPassed = regex.test(actualError);
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
                  errorPassed = regex.test(actualError);
                  expect(actualError).toMatch(regex);
                } else {
                  errorPassed = actualError.includes(expectedError);
                  expect(actualError).toContain(expectedError);
                }
              } else {
                errorPassed = actualError === expectedError;
                expect(actualError).toEqual(expectedError);
              }
            }

            const errorType = "error:" + (errorObj.errorRegex ? "regex" : errorObj.errorPartial ? "partial" : errorObj.errorJson ? "json" : "exact");
            scores.push({ type: errorType, passed: errorPassed });
            if (!errorPassed) passed = false;
          }
        }

        // Record results for --output JSON
        if (OUTPUT_FILE) {
          const entry = {
            title: test.title || `${testIndex + 1}. should print output`,
            passed,
            duration: Date.now() - startTime
          };
          if (scores.length > 0) entry.results = scores;
          testResults.push(entry);
        }
      };

      const hasAi = (test.expects || []).some(e => e.expectAi) || (test.errors || []).some(e => e.errorAi);
      const hasScore = (test.expects || []).some(e => e.expectScore);
      const timeout = test.timeout || (hasAi || hasScore ? AI_TIMEOUT : undefined);

      if (timeout) {
        it(`${test.title || `${testIndex + 1}. should print output`}`, testFunction, timeout);
      } else {
        it(`${test.title || `${testIndex + 1}. should print output`}`, testFunction);
      }
    });

    scenario.children.forEach((child, childIndex) => {
      createScenario(childIndex, child, directory, `${prefix}${index + 1}.`, params);
    });
}
