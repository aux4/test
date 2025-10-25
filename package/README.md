# aux4/test

aux4 testing tool

aux4/test provides a lightweight test runner and helpers for validating command output and file-based test scenarios within aux4 packages. It exposes commands to run test suites and to add new tests to markdown test files. The package is designed to make writing repeatable, executable tests (execute/expect/error blocks, file blocks, hooks, timeouts, and modifiers) straightforward and scriptable as part of aux4 workflows.

Main use cases include validating CLI behavior, asserting stdout/stderr content with advanced matching modifiers (regex, partial, ignoreCase), testing file scoping and lifecycle (file blocks), and exercising setup/teardown flows with hooks. It integrates with system Node and Jest installations where available and is intended to be used alongside other aux4 packages and CI pipelines to ensure package behavior remains correct.

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

Run the test suite in the current directory:

```bash
aux4 test run
```

This runs the aux4 test runner against the current directory (default), executing any test markdown files found under test/ or the specified path and validating outputs according to the execute/expect/error blocks.

## Running Tests

Run tests in a specific directory or file. The run command validates execute/expect/error blocks, handles file blocks, hooks, modifiers (regex, partial, ignoreCase), and respects per-test timeouts.

```bash
aux4 test run <dir>
```

- <dir> (positional) — The directory or file to run tests in. Default: `.`  
- Command documentation: [aux4 test run](./commands/test/run)

Example: run the bundled test suite

```bash
aux4 test run test
```

## Adding Tests

Add a new test to an existing test markdown file. The add command appends a test entry with the provided name, level (markdown heading level), optional included files, and the execute line to run.

```bash
aux4 test add <testFile> --name "Test name" --level 2 --file setup.sh --file input.txt --execute "echo hello"
```

- testFile (positional) — The test file to add the test to (required)  
- level — The markdown title level for the test (default: 2)  
- name — The name/title of the test  
- file (multiple) — Files to include in the test block (each becomes a file:... block)  
- execute — The command line to execute in the test  
- Command documentation: [aux4 test add](./commands/test/add)

## Assertions & Modifiers

aux4/test supports several assertion styles and modifiers embedded in test markdown files:

- `execute` / `expect` / `error` — Basic command output assertions
- `expect:ignoreCase` — Case-insensitive matching
- `expect:partial` — Substring and wildcard matching with `*?`
- `expect:regex` — Regular expression matching
- Combined modifiers like `expect:regex:ignoreCase`

These are demonstrated in the included test files under test/.

## Hooks and File Blocks

Tests may include lifecycle hooks and file blocks to prepare and isolate test environments:

- `beforeAll` / `afterAll` — Run once for a group of tests
- `beforeEach` / `afterEach` — Run around each test
- `file:filename` blocks — Create files available to nested tests (scoped)

See the hooks and file-scope examples below for typical patterns.

## Timeouts

Per-test timeouts can be specified with a `timeout` block. This allows long-running commands to be given higher limits while keeping short tests fast. If omitted, the default Jest timeout applies.

## Examples

### Simple execute/expect assertions

The following excerpt (from test/execute-expect.test.md) demonstrates basic execute and expect blocks that assert stdout and stderr.

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

## Multi-line Output

```execute
printf "Line 1\nLine 2\nLine 3\n"
```

```expect
Line 1
Line 2
Line 3
```

## Error Output Test

```execute
echo "Error message" >&2
```

```error
Error message
```

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

## Environment Variable Test

```execute
MESSAGE="Test Variable" && echo "$MESSAGE"
```

```expect
Test Variable
```
````

Run this test file:

```bash
aux4 test run test/execute-expect.test.md
```

This validates that the commands produce the expected stdout and stderr shown in the expect/error blocks.

### Case-insensitive assertions (expect:ignoreCase)

The following excerpt (from test/expect-ignorecase.test.md) shows use of the ignoreCase modifier to match outputs regardless of letter case.

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

## Mixed Case Input

```execute
echo "CamelCase Variable"
```

```expect:ignoreCase
camelcase variable
```

## All Uppercase Expected

```execute
echo "lowercase text"
```

```expect:ignoreCase
LOWERCASE TEXT
```

## Case Insensitive Error Match

```execute
echo "ERROR: File Not Found" >&2
```

```error:ignoreCase
error: file not found
```
````

Run this test file:

```bash
aux4 test run test/expect-ignorecase.test.md
```

This verifies that expected text matches regardless of case as shown.

### File block scope (file creation and scoping)

The following excerpt (from test/file-scope.test.md) demonstrates how file blocks create files available to nested tests and how scope prevents sibling tests from seeing those files.

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

### Nested Test 2 - File Still Available in Same Parent

```execute
ls parent-file.txt
```

```expect
parent-file.txt
```

#### Deeply Nested Test - File Should Still Be Available

```execute
echo "File exists: $(test -f parent-file.txt && echo yes || echo no)"
```

```expect
File exists: yes
```

## Sibling Scenario - File Should NOT Be Available

This scenario is at the same level as "Parent Scenario with File", so the parent-file.txt should not be available here.

```execute
ls parent-file.txt 2>/dev/null || echo "File not found"
```

```expect
File not found
```
````

Run this test file:

```bash
aux4 test run test/file-scope.test.md
```

This validates file visibility rules used by aux4 tests.

### Hooks: setup and cleanup

The following excerpt (from test/hooks.test.md) demonstrates beforeAll and afterAll hooks and creating temporary files for tests.

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

### Test 2 - Create Temporary File

```file:temp-file.txt
This is a temporary test file.
```

```execute
cat temp-file.txt
```

```expect
This is a temporary test file.
```
````

Run this test file:

```bash
aux4 test run test/hooks.test.md
```

This verifies that setup files are created before tests and cleaned up after the suite completes.

### Timeout configuration

The following excerpt (from test/timeout.test.md) shows per-test timeout blocks to allow longer-running commands.

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

## Medium Timeout Test

```timeout
5000
```

```execute
sleep 1 && echo "Command completed after 1 second"
```

```expect
Command completed after 1 second
```

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

Run this test file:

```bash
aux4 test run test/timeout.test.md
```

This demonstrates using the `timeout` block to control how long a test is allowed to run.

## Configuration

This package uses test markdown files located under the test/ directory. No additional configuration file is required to run the bundled tests. Use the `aux4 test add` command to programmatically append new tests to a given test file.

## License

This package is licensed under the Apache-2.0 License.

See [LICENSE](./license) for details.
