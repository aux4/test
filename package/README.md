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

The package provides two primary commands:

- aux4 test run — run tests (link: ./commands/test/run)
- aux4 test add — add test entries to a test file (link: ./commands/test/add)

See command docs: [aux4 test run](./commands/test/run) and [aux4 test add](./commands/test/add).

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

- Combinations like ```expect:regex:ignoreCase are supported.

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
- Wildcards: `*?` acts like a "match anything" placeholder in partial patterns. For example `Start *? end` will match `Start middle end`.
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

More examples in the same file show `5000` and `10000` millisecond timeouts. If no `timeout` block is present, the runner uses the default test framework timeout (e.g., Jest default).

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
- test/multiple-expects-test.test.md — multiple expectations per execute
- test/file-scope.test.md — file blocks and scoping rules
- test/hooks.test.md — beforeAll/afterAll (and hooks in general)
- test/timeout.test.md — timeout block usage
- test/add.test.md — programmatic test creation via aux4 test add

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
