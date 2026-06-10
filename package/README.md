# aux4/test

aux4 testing tool

aux4/test provides a lightweight markdown-driven test runner for aux4 packages. Tests are written as Markdown files with special fenced blocks (execute, expect, error, file, timeout, hooks, etc.). The package interprets these files and runs commands, capturing stdout/stderr and validating output against the provided expectations. It's designed for authoring reproducible command-line tests, verifying CLI behavior, file artefacts, timeouts, and test hooks.

This README documents all features exercised by the official test suite. Each section shows real test-file content (copied from the test/ folder) and explains the behavior and usage. Examples are taken verbatim from the repository tests so you can copy and run them.

## Installation

```bash
aux4 aux4 pkger install aux4/test
```

## System Dependencies

This package requires system dependencies. You need to have one of the following system installers:

- [brew](/r/public/packages/aux4/system-installer-brew)
- [apt](/r/public/packages/aux4/system-installer-apt)
- [npm](/r/public/packages/aux4/system-installer-npm)

For more details, see [system-installer](/r/public/packages/aux4/pkger/commands/aux4/pkger/system).

## Quick Start

Run the test runner in the current directory:

```bash
aux4 test run .
```

This scans for `.test.md` files in the directory structure and runs them using the aux4 test runner. By default the runner uses the directory "."; you may pass another directory as the positional dir variable.

The package provides these primary commands:

- aux4 test run — run tests (link: ./commands/test/run)
- aux4 test coverage — run tests with coverage report (link: ./commands/test/coverage)
- aux4 test report — render coverage report from JSON file (link: ./commands/test/report)
- aux4 test add — add test entries to a test file (link: ./commands/test/add)

See command docs: [aux4 test run](./commands/test/run), [aux4 test coverage](./commands/test/coverage), [aux4 test report](./commands/test/report), and [aux4 test add](./commands/test/add).

---

## Execute and Expect Basic Blocks

Overview:

- `execute` blocks contain shell commands to run.
- `expect` blocks validate stdout (exact match by default).
- `error` blocks validate stderr.
- A test typically pairs a single `execute` block with one or more expect/error blocks.

Example (from test/execute-expect.test.md):

````markdown
# Execute/Expect Basic Functionality

Tests for basic execute and expect blocks to verify command execution and output validation.

## Simple Echo Test

```execute
echo "Hello World"
```

```expect
Hello World
```
````

How it works:

- The runner executes the command(s) inside the ```execute block.
- It captures stdout and stderr separately.
- The `expect` block is matched against stdout; `error` is matched against stderr.
- Exact matching: the default `expect` requires the output lines to match exactly (including order and line breaks).

Other examples in the same file illustrate multi-line output, combined stdout/stderr, and environment variable usage.

---

## Expect Modifiers — partial, ignoreCase, regex

The runner supports modifiers appended to the expect/error block token to change matching semantics.

General forms:

- ```expect:partial — substring / wildcard matching

  ```

- ```expect:ignoreCase — case-insensitive exact matching

  ```

- ```expect:regex — regular-expression matching

  ```

- ```expect:json — JSON formatting (pretty-print compact JSON before comparing)

  ```

- Combinations like ```expect:regex:ignoreCase are supported. The `:json` modifier can also be combined with others: ```expect:json:partial, ```expect:json:ignoreCase, ```expect:json:regex.

Below are examples directly taken from the tests for each modifier.

Expect:partial (substring and wildcard matching)

````markdown
# Expect Partial Modifier

Tests for expect:partial modifier to verify substring matching and wildcard pattern matching.

## Simple Substring Match

```execute
echo "This is a long output with many words"
```

```expect:partial
long output
```
````

Key points:

- `partial` checks that the expected text occurs somewhere in stdout.
- Wildcards:
  - `*?` acts like a "match anything" placeholder in partial patterns. For example `Start *? end` will match `Start middle end`.
  - `*` acts like a greedy "match anything" placeholder.
  - `**` acts like a multiline "match anything" placeholder that can span across newlines. For example `Start**end` will match `Start\nMiddle content\nend`.
- `partial` also applies to `error:partial` for stderr.

Expect:ignoreCase (case-insensitive matching)

````markdown
# Expect IgnoreCase Modifier

Tests for expect:ignoreCase modifier to verify case-insensitive output matching.

## Basic Case Insensitive Match

```execute
echo "Hello World"
```

```expect:ignoreCase
hello world
```
````

Key points:

- `ignoreCase` makes the comparison case-insensitive.
- It works for both `expect` (stdout) and `error` (stderr).
- Can combine with `regex` so `expect:regex:ignoreCase` runs a case-insensitive regex.

Expect:regex (regular expressions)

````markdown
# Expect Regex Modifier

Tests for expect:regex modifier to verify regular expression matching in output validation.

## Simple Pattern Matching

```execute
echo "Hello World 123"
```

```expect:regex
^Hello World \d+$
```
````

Key points:

- Regexes are applied line-wise unless the pattern covers multiple lines explicitly.
- Use typical regex escapes (e.g., \d, \b) as in the test examples.
- `error:regex` validates stderr with a regex.

Expect:json (JSON formatting)

The `:json` modifier pretty-prints compact JSON output before comparison. When a command outputs inline/compact JSON like `{"name":"John","age":30}`, the modifier parses it and reformats it with `JSON.stringify(JSON.parse(value), null, 2)` so the `expect` block can be written in a human-readable, indented format.

The JSON formatting is applied to the **actual output** (stdout or stderr) before any other modifier logic runs. This means `:json` can be combined with other modifiers:

- `expect:json` — exact match against pretty-printed JSON
- `expect:json:partial` — substring/wildcard match against pretty-printed JSON
- `expect:json:ignoreCase` — case-insensitive match against pretty-printed JSON
- `expect:json:regex` — regex match against pretty-printed JSON
- `error:json` — same behavior for stderr

If the output is not valid JSON, it is left as-is and the test will fail with a meaningful diff showing what was expected vs. the raw output.

````markdown
# Expect JSON Modifier

## Basic JSON Object

```execute
echo '{"name":"John","age":30}'
```

```expect:json
{
  "name": "John",
  "age": 30
}
```

## JSON Combined with Partial

```execute
echo '{"status":"ok","data":{"count":42,"items":["x","y"]}}'
```

```expect:json:partial
"count": 42
```

## Error JSON

```execute
echo '{"error":"not found","code":404}' >&2
```

```error:json
{
  "error": "not found",
  "code": 404
}
```
````

---

## Multiple Expects for a Single Execute

Overview:

- A single `execute` block may be followed by many expect blocks.
- All expectations are evaluated against that execute's captured stdout/stderr.
- This is useful to assert multiple aspects of multi-line output.

Example (from test/multiple-expects-test.test.md):

````markdown
# Multiple Expects Test

Test that a single execute command can have multiple expect blocks with different modifiers.

## Test Multiple Expects for Single Execute

```execute
echo "Line 1: Hello World
Line 2: Testing 123
Line 3: Final result"
```

```expect:partial
Hello World
```

```expect:partial
Testing 123
```

```expect:partial
Final result
```

```expect:regex
Line \d+: Hello World
```
````

How it works:

- Each `expect` (or `error`) block is evaluated independently.
- If any one expectation fails, the test fails (the runner reports which expectation failed).

---

## File Blocks and File Scope

Overview:

- `file:<filename>` blocks create files with the provided content during the test.
- Files created by `file` blocks are scoped: they are available to nested tests, but siblings do not share file state.
- File blocks are commonly used to set up fixtures (config files, sample inputs, etc.).

Example (from test/file-scope.test.md):

````markdown
# File Block Scope Testing

Tests to verify that files created in ```file blocks are available for nested tests but not for tests at the same level.

## Parent Scenario with File

```file:parent-file.txt
This file is created at parent level
```

### Nested Test 1 - File Should Be Available

```execute
cat parent-file.txt
```

```expect
This file is created at parent level
```
````

Important scope rules illustrated by the test:

- A `file` declared at a parent level is available to nested scenarios/tests beneath it.
- Files created in one sibling scenario are not visible in other sibling scenarios (each sibling has its own scope).
- When writing tests, place file blocks at the scenario level that should share those files with nested tests.

Example showing sibling isolation (from same test file):

````markdown
This scenario is at the same level as "Parent Scenario with File", so the parent-file.txt should not be available here.

```execute
ls parent-file.txt 2>/dev/null || echo "File not found"
```

```expect
File not found
```
````

---

## Hooks: beforeAll, afterAll, beforeEach, afterEach

Overview:

- Hooks are multi-command blocks that run at certain points in the test lifecycle:
  - `beforeAll` — run once before the tests in the current scenario.
  - `afterAll` — run once after all tests in the current scenario.
  - `beforeEach` — run before each test in the current scenario.
  - `afterEach` — run after each test in the current scenario.
- Tests in the repository exercise `beforeAll` and `afterAll`. The runner supports the other hooks as well; they follow the same scoping rules as file blocks.

Example with beforeAll/afterAll (from test/hooks.test.md):

````markdown
# Hooks Functionality

Tests for beforeAll, afterAll, beforeEach, and afterEach hooks to verify test setup and cleanup.

## Setup and Cleanup Hooks

```beforeAll
mkdir -p test-dir
echo "Setup complete" > test-dir/setup.log
```

```afterAll
rm -rf test-dir
```

### Test 1 - Verify Setup

```execute
cat test-dir/setup.log
```

```expect
Setup complete
```
````

How it works:

- `beforeAll` created the directory and file; nested tests verify its presence.
- `afterAll` removes the created artifacts.
- `beforeEach` and `afterEach` (not used in the example) would run around each test in the scenario, enabling per-test setup/cleanup (e.g., resetting state or deleting temporary files).
- Hook blocks may contain multiple shell commands; they are executed in the same shell environment as the tests (so side effects are available).

---

## Timeout Block

Overview:

- Use a `timeout` block containing a number (milliseconds) to override the default test timeout for the following `execute` block.
- The test suite demonstrates short and long timeouts to cover long-running commands.

Examples (from test/timeout.test.md):

````markdown
# Timeout Functionality

Tests for timeout configuration to verify that long-running tests can be properly configured.

## Fast Command Test

```timeout
1000
```

```execute
echo "Quick command"
```

```expect
Quick command
```
````

More examples in the same file show `5000` and `10000` millisecond timeouts. If no `timeout` block is present, the runner uses the default timeout.

Practical notes:

- Place the `timeout` block directly before the `execute` it applies to.
- The timeout must be a numeric value in milliseconds.
- If the command exceeds the timeout, the test fails with a timeout error.

---

## Error Blocks (stderr) and Combined Output

- `error` blocks validate stderr content (supports the same modifiers as `expect`, e.g., `error:partial`, `error:regex`, `error:ignoreCase`).
- Tests show combined stdout and stderr where both `expect` and `error` blocks are used for the same execute.

Example snippet (from execute-expect.test.md):

````markdown
## Combined Output and Error

```execute
echo "Success output" && echo "Error output" >&2
```

```expect
Success output
```

```error
Error output
```
````

Key points:

- stdout and stderr are captured separately and matched to `expect` and `error` blocks respectively.
- If both appear, you can assert on each independently.

---

## Adding/Authoring Tests: aux4 test add

The package includes `aux4 test add` to programmatically append tests to a test markdown file. The test suite includes tests that exercise adding tests with files and different heading levels.

Excerpt (from test/add.test.md):

`````markdown
# Aux4 Test Add Command

Tests for the `aux4 test add` command functionality to verify test creation and file generation.

```beforeAll
echo "# Test Suite" > my-test-suite.test.md
```

```afterAll
rm -f my-test-suite.test.md sample-file.txt another-file.js
```

## Basic Test Addition

### Add Simple Test with Execute

```execute
echo "# Test Suite" > my-test-suite.test.md && aux4 test add my-test-suite.test.md --level 2 --name "Simple Echo Test" --execute "echo Hello World"
```

```execute
cat my-test-suite.test.md
```

````expect
# Test Suite

## Simple Echo Test

```execute
echo Hello World
```

```expect
Hello World
```
````
`````

Usage:

- `aux4 test add <testFile> --level <n> --name "<name>" --execute "<command>"` appends a test at the specified Markdown heading level.
- `--file <path>` may be included multiple times to embed file blocks into the test being added.
- The add command is useful for generating or updating test files programmatically as part of toolchains.

The add.test.md file includes multiple examples: adding tests with single or multiple files, different heading levels, and execute-only tests. The test verifies that the add command correctly writes headers, file blocks, execute blocks, and expect blocks into the test file.

---

## Putting It All Together — Examples

Below are runnable, real examples taken directly from the tests. Each example includes the test file heading and the important sections so you can see the full test structure.

Example: Basic execute/expect test file fragment

````markdown
# Execute/Expect Basic Functionality

## Simple Echo Test

```execute
echo "Hello World"
```

```expect
Hello World
```
````

Example: Partial matching with wildcards

````markdown
# Expect Partial Modifier

## Wildcard Pattern with \*?

```execute
echo "Start middle end"
```

```expect:partial
Start *? end
```
````

Example: Case-insensitive expect and combining with regex

````markdown
# Expect IgnoreCase Modifier

## Combined Modifiers - Regex and IgnoreCase

```execute
echo "Error Code: ABC123"
```

```expect:regex:ignoreCase
error code: [a-z]+\d+
```
````

Example: File scoping (parent creates a file, nested tests use it)

````markdown
# File Block Scope Testing

## Parent Scenario with File

```file:parent-file.txt
This file is created at parent level
```

### Nested Test 1 - File Should Be Available

```execute
cat parent-file.txt
```

```expect
This file is created at parent level
```
````

Example: Hooks setup/teardown

````markdown
# Hooks Functionality

## Setup and Cleanup Hooks

```beforeAll
mkdir -p test-dir
echo "Setup complete" > test-dir/setup.log
```

```afterAll
rm -rf test-dir
```

### Test 1 - Verify Setup

```execute
cat test-dir/setup.log
```

```expect
Setup complete
```
````

Example: Timeout usage

````markdown
# Timeout Functionality

## Long Timeout Test

```timeout
10000
```

```execute
sleep 2 && echo "Command completed after 2 seconds"
```

```expect
Command completed after 2 seconds
```
````

Example: Adding a test using aux4 test add and verifying the produced test file (excerpt)

`````markdown
# Aux4 Test Add Command

```execute
echo "# Test Suite" > my-test-suite.test.md && aux4 test add my-test-suite.test.md --level 2 --name "Simple Echo Test" --execute "echo Hello World"
```

```execute
cat my-test-suite.test.md
```

````expect
# Test Suite

## Simple Echo Test

```execute
echo Hello World
```

```expect
Hello World
```
````
`````

---

## Expect:similar — Deterministic Text Similarity

The `:similar` modifier compares the command output against a reference using text similarity metrics. No LLM calls — fully deterministic with zero token cost.

Two forms for providing the reference:

**Inline reference** (content below `---` separator):

````markdown
```execute
echo "Hello World"
```

```expect:similar
metric: fuzzy
pass: 0.8
---
Hello World
```
````

**File reference:**

````markdown
```file:expected/output.txt
Hello World
```

```execute
echo "Hello World!"
```

```expect:similar
pass: 0.9
file: expected/output.txt
```
````

Block fields:

- `name` — optional label for the score (appears in JSON output)
- `metric` — similarity algorithm: `fuzzy` (default), `cosine`, `jaccard`
- `pass` — minimum similarity score 0-1 (default: `0.8`)
- `file` — path to reference file (alternative to inline content)

Available metrics:

- `fuzzy` — Levenshtein distance ratio (0-1). Character-level similarity. Good for "almost the same" text.
- `cosine` — word-level cosine similarity (0-1). Good for meaning overlap regardless of word order.
- `jaccard` — word set intersection/union (0-1). Good for "same words present."

Can be combined with `:ignoreCase`:

````markdown
```expect:similar:ignoreCase
pass: 0.9
---
hello world
```
````

Output:

```
  similarity: 0.92 (fuzzy)  ✓ PASS (>= 0.8)
```

---

## Expect:ai:score — LLM-as-a-Judge Scoring

The `:ai:score` modifier uses an LLM to score the command output on a criterion, returning a numeric score instead of pass/fail. Requires `--aiConfig` and `--configFile` like `expect:ai`.

````markdown
```execute
cat config.yaml
```

```expect:ai:score
name: correctness
eval: Does the output match expected/config.yaml?
range: 1-5
pass: 3
```

```expect:ai:score
name: completeness
eval: Are all required fields present?
```
````

Block fields:

- `name` — optional label for the score
- `eval` — what to evaluate (required, the judge prompt)
- `range` — score range as `min-max` (default: `1-5`)
- `pass` — minimum passing score (default: `3`)

The judge agent has `readFile` tool access, so the `eval` text can reference files created by `file:` blocks (e.g., "Does the output match expected/config.yaml?").

Output:

```
  correctness: 5/5   Values match the ground truth
  completeness: 4/5   Missing optional headers
  ✓ PASS (all criteria met)
```

Run with:

```bash
aux4 test run test.md --aiConfig agent --configFile config.yaml
```

---

## JSON Output — --output flag

Write structured test results to a JSON file:

```bash
aux4 test run test/ --output results.json
```

The JSON includes all test results with scores and assertion outcomes:

```json
{
  "timestamp": "2026-04-25T10:30:00Z",
  "tests": [
    {
      "title": "should create valid config",
      "passed": true,
      "duration": 8400,
      "results": [
        { "type": "exact", "passed": true },
        { "type": "similar", "name": "structure", "metric": "fuzzy", "score": 0.92, "pass": 0.8 },
        { "type": "ai:score", "name": "correctness", "eval": "Does it match?", "score": 5, "max": 5, "pass": 3, "reason": "Values match" }
      ]
    }
  ],
  "summary": {
    "total": 1,
    "passed": 1,
    "failed": 0
  }
}
```

---

## Coverage — Step-Level Instrumentation

aux4/test includes a coverage system that tracks which execute steps, branches, and loop iterations were exercised during test runs or regular command usage.

### Running Tests with Coverage

```bash
aux4 test coverage test/
```

This runs all tests normally, then prints a coverage report showing which commands and execute steps were hit:

```text
Coverage Report
======================================================================

  Package: my-app@1.0.0

    main/build          3/3 steps  ████████████ 100%  1.2s
    main/deploy         2/5 steps  █████░░░░░░░  40%  0.3s
      ✗ [2] when:${env}=prod:nout:backup-db
      ✗ [3] nout:notify-slack ${env}
      ✗ [4] log:deployed to ${env}

----------------------------------------------------------------------

  Summary:
    Commands:   2/3 (67%)
    Steps:      5/8 (63%)
    Branches:   1/2 (50%)

  Slowest commands:
    main/build          1.2s
    main/deploy         0.3s

======================================================================
```

### Coverage Metrics

| Metric | What it tracks |
|--------|---------------|
| **Step coverage** | Which execute items in each command were hit |
| **Command coverage** | Which commands were invoked at least once |
| **Branch coverage** | Which `when:` conditions were evaluated as both true and false |
| **Iteration tracking** | How many times `each:` loops ran and per-iteration durations |
| **Duration** | Time per step, command, and iteration |

### Standalone Usage with AUX4_COVERAGE_FILE

Coverage instrumentation is built into the aux4 core. Set the `AUX4_COVERAGE_FILE` environment variable to record coverage from any `aux4` command:

```bash
# Record coverage from regular commands
AUX4_COVERAGE_FILE=cov.json aux4 build
AUX4_COVERAGE_FILE=cov.json aux4 deploy --env staging

# Multiple runs merge into the same file
AUX4_COVERAGE_FILE=cov.json aux4 deploy --env prod

# View the report
aux4 test report cov.json
```

When `AUX4_COVERAGE_FILE` is not set, coverage is completely disabled with zero performance overhead.

### Viewing a Coverage Report

```bash
aux4 test report <coverage-file> [--dir <path>]
```

The `report` command reads a coverage JSON file and scans the specified directory for `.aux4` files to build the full universe of commands, then renders which were covered and which were missed.

See command docs: [aux4 test coverage](./commands/test/coverage) and [aux4 test report](./commands/test/report).

---

## Datasets — Data-Driven Tests

The `dataset` block runs an entire scenario (including nested children) once per entry in a JSON array, similar to Jest's `it.each`. Variables from each dataset entry are substituted into `execute`, `expect`, `error`, `file`, and hook blocks using `{{variable}}` syntax.

Two syntax forms are supported:

**Config block** (with options):

````markdown
## should add numbers

```dataset
file: dataset/math.json
root: $.data.items
key: id
```

```execute
echo $(({{a}} + {{b}}))
```

```expect
{{result}}
```
````

**Shorthand** (file path in the language tag):

````markdown
## should add numbers

```dataset:dataset/math.json
```

```execute
echo $(({{a}} + {{b}}))
```

```expect
{{result}}
```
````

Where `dataset/math.json` contains:

```json
[
  {"a": 1, "b": 2, "result": "3"},
  {"a": 10, "b": 20, "result": "30"}
]
```

### Dataset Block Fields

- `file` — path to a JSON file (resolved relative to the test file's directory)
- `root` — JSONPath expression to extract an array from the JSON structure (default: `$`, the root). Use when the array is nested inside the JSON, e.g., `$.data.items`
- `key` — field name from each entry to use as the label in test output. When set, entries appear as `[keyValue]` instead of `[#0]`, `[#1]`, etc.

### How It Works

- The `dataset` block is placed at a scenario heading level (e.g., `##`). The entire `describe` for that scenario — including all its tests and nested children — is repeated once per dataset entry.
- Dataset variables are merged with config params (`--config`). **Dataset values override config values** when keys collide.
- Object and array values in dataset entries are automatically `JSON.stringify`'d for substitution.
- `null`/`undefined` values become empty strings.
- Empty datasets skip the scenario with a warning.
- Non-array data (after `root` resolution) produces an error.

### Nested Datasets (Cartesian Product)

When a child scenario also has a `dataset` block, the result is a cartesian product — every combination runs:

````markdown
## should combine greetings

```dataset
file: dataset/prefixes.json
```

### should greet

```dataset
file: dataset/names.json
```

```execute
echo "{{prefix}}, {{name}}!"
```

```expect:partial
{{prefix}}, {{name}}!
```
````

With `prefixes.json` = `[{"prefix":"Hello"},{"prefix":"Hi"}]` and `names.json` = `[{"name":"Alice"},{"name":"Bob"}]`, this runs 4 tests (2 x 2).

The child dataset entries are merged on top of the parent's, so inner variables can override outer ones.

### Test Output

Each dataset entry appears as a separate `describe` block in test output:

```text
1.1. should add numbers [#0]
  ✓ 1. should print output
1.1. should add numbers [#1]
  ✓ 1. should print output
```

With `key: id`:

```text
1.1. should add numbers [addition]
  ✓ 1. should print output
1.1. should add numbers [subtraction-like]
  ✓ 1. should print output
```

### Hooks with Datasets

`beforeAll`, `afterAll`, `beforeEach`, and `afterEach` hooks inside a dataset scenario run per entry — each entry gets its own `describe` block, so `beforeAll` runs once per entry, not once globally.

---

## Nested File Paths

`file:` blocks automatically create parent directories if they don't exist, and clean up only the directories that were created:

````markdown
```file:nested/deep/config.yaml
host: localhost
port: 3000
```

```execute
cat nested/deep/config.yaml
```

```expect
host: localhost
port: 3000
```
````

---

## Test File Conventions and Best Practices

- Each test file is Markdown and SHOULD begin with a top-level heading (# Title). The test runner uses the document structure to group scenarios and nested tests.
- Use `file:<filename>` blocks to create fixture files. Place them in the scenario where they should be visible (parent level for nested tests to access).
- Prefer small, focused `execute` blocks and multiple `expect` blocks to validate different aspects of output.
- Use `expect:partial` for flexible substring tests, `expect:regex` for pattern matching, and `expect:ignoreCase` for case-insensitive comparisons.
- Use `timeout` only when necessary for long-running commands to avoid hanging test suites.
- Use `beforeAll` and `afterAll` for expensive setup/cleanup that applies to many tests; use `beforeEach`/`afterEach` for per-test isolation.
- Avoid sharing state between sibling scenarios; rely on scoped file blocks and hooks to control visibility and cleanup.

---

## Examples Summary

The provided test files in this package demonstrate all primary features:

- test/execute-expect.test.md — execute, expect, error, multi-line output
- test/expect-partial.test.md — partial matching and wildcard usage
- test/expect-ignorecase.test.md — case-insensitive matching
- test/expect-regex.test.md — regex matching
- test/expect-json.test.md — JSON formatting modifier
- test/multiple-expects-test.test.md — multiple expectations per execute
- test/file-scope.test.md — file blocks and scoping rules
- test/hooks.test.md — beforeAll/afterAll (and hooks in general)
- test/timeout.test.md — timeout block usage
- test/add.test.md — programmatic test creation via aux4 test add
- test/expect-similar.test.md — text similarity matching (fuzzy, cosine, jaccard)
- test/expect-ai-score.test.md — LLM-as-a-judge scoring
- test/output-json.test.md — JSON output flag
- test/coverage.test.md — coverage report rendering and JSON format
- test/file-nested-path.test.md — nested directory creation for file blocks
- test/dataset-basic.test.md — basic dataset-driven tests
- test/dataset-root.test.md — dataset with JSONPath root
- test/dataset-nested.test.md — nested datasets (cartesian product)
- test/dataset-key.test.md — dataset with key field for labels
- test/dataset-objects.test.md — dataset with object values
- test/dataset-file-syntax.test.md — dataset:file shorthand syntax

You can open each file to see complete, runnable test fragments. The README examples above copy the real tests so you can replicate them.

---

## Troubleshooting & Tips

- If an `expect` fails, check which block failed and compare the captured stdout/stderr to the expected content.
- Use `expect:partial` for tests where output contains timestamps, order-insensitive fragments, or variable content.
- For complex output, prefer `expect:regex` with anchors and groups to precisely target the necessary parts.
- If files are unexpectedly missing in a scenario, verify where the `file:` block is declared and that scoping matches the intended nested tests.
- To programmatically add tests, use `aux4 test add` and then inspect the generated `.test.md` file.

---

## License

This package is licensed under the Apache-2.0 License.

See [LICENSE](./license) for details.
