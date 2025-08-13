# aux4/test

aux4 testing tool

## Usage

Manage aux4 tests

- [aux4 test run](./commands/test/run) Run aux4 tests
- [aux4 test add](./commands/test/add) Add a test to the test file

## Writing Tests with .test.md Files

aux4 tests are written in Markdown files with the `.test.md` extension. These files use a structured format with headings to define test scopes and code blocks for test execution and expectations.

### Test Structure and Scope

Tests are organized hierarchically using Markdown headings:

- **# (H1)**: Defines the main test scenario/suite
- **## (H2-H6)**: Defines nested test scenarios within the parent scope

Each heading level creates a new test scope that can contain:

- Setup/teardown commands
- Test files
- Execute/expect test pairs

### Code Blocks

#### Execute Block

Defines the command to run:

````markdown
```execute
echo "Hello World"
```
````

#### Expect Block

Defines the expected output with optional modifiers:

````markdown
```expect
Hello World
```
````

#### Expect Modifiers

You can modify expect behavior using colon-separated modifiers:

- **`partial`**: Match substring instead of exact match
- **`ignoreCase`**: Case-insensitive matching
- **`regex`**: Treat expected value as regular expression

Examples:

````markdown
```expect:partial
Hello
```

```expect:ignoreCase
hello world
```

```expect:regex
Hello.*World
```

```expect:partial:ignoreCase
hello
```
````

#### Error Block

Expect specific error output:

````markdown
```error
Command not found
```
````

Error blocks support the same modifiers as expect blocks (`partial`, `ignoreCase`, `regex`).

#### Setup and Teardown Blocks

- **`beforeAll`**: Run once before all tests in the scope
- **`afterAll`**: Run once after all tests in the scope
- **`beforeEach`**: Run before each test in the scope
- **`afterEach`**: Run after each test in the scope

````markdown
```beforeAll
mkdir temp
```

```afterAll
rm -rf temp
```
````

#### File Block

Create temporary files for testing:

````markdown
```file:test.txt
This is test content
that spans multiple lines
```
````

### Example Test File

````markdown
# Echo Tests

## Basic functionality

```beforeAll
mkdir -p test-output
```

```afterAll
rm -rf test-output
```

### Exact match

```execute
echo "Hello, World!"
```

```expect
Hello, World!
```

### Case insensitive matching

```execute
echo "Hello, World!"
```

```expect:ignoreCase
hello, world!
```

### Partial matching

```execute
echo "The quick brown fox jumps"
```

```expect:partial
quick brown
```

### Regular expression matching

```execute
echo "Version 1.2.3"
```

```expect:regex
Version \d+\.\d+\.\d+
```

## Error handling

```execute
nonexistent-command
```

```error:partial
command not found
```
````

## Examples

Run aux4 tests

```bash
aux4 test run --dir .
```

Add a test to the test file

```bash
aux4 test add --testFile <test_file> --level 2 --name <test_name> --file <file1> --file <file2> --execute <command>
```

## Adding Tests with the Add Command

The `aux4 test add` command allows you to programmatically add new tests to existing `.test.md` files. This is useful for automation or when you want to quickly scaffold new test cases.

### Command Syntax

```bash
aux4 test add --testFile <test_file> --level <heading_level> --name <test_name> [options]
```

### Parameters

- **`--testFile`**: Path to the `.test.md` file where the test should be added
- **`--level`**: Heading level (1-6) that determines the test scope hierarchy
- **`--name`**: Name of the test (will become the heading text)
- **`--file <filename>`**: Add file blocks to the test (can be used multiple times)
- **`--execute <command>`**: Add an execute block with the specified command

### Examples

Add a simple test with execution:

```bash
aux4 test add --testFile my.test.md --level 2 --name "Test echo command" --execute "echo 'Hello World'"
```

Add a test with file setup:

```bash
aux4 test add --testFile api.test.md --level 2 --name "Test API endpoint" --file config.json --file data.txt --execute "curl -X POST localhost:3000/api"
```

Add a nested test (level 3 under existing level 2):

```bash
aux4 test add --testFile integration.test.md --level 3 --name "Error handling" --execute "invalid-command"
```

### Generated Test Examples

The add command generates markdown content that follows the test file structure. Here are examples of what gets generated:

**Simple test with execution** (`aux4 test add --testFile my.test.md --level 2 --name "Test echo command" --execute "echo 'Hello World'"`):

````markdown
## Test echo command

```execute
echo 'Hello World'
```
````

**Test with file setup** (`aux4 test add --testFile api.test.md --level 2 --name "Test API endpoint" --file config.json --file data.txt --execute "curl -X POST localhost:3000/api"`):

````markdown
## Test API endpoint

```file:config.json
```

```file:data.txt
```

```execute
curl -X POST localhost:3000/api
```
````

**Nested test** (`aux4 test add --testFile integration.test.md --level 3 --name "Error handling" --execute "invalid-command"`):

````markdown
### Error handling

```execute
invalid-command
```
````

The add command will insert the new test at the appropriate location in the file based on the heading level, maintaining the hierarchical structure of your test file.

## Testing aux4 Commands

You can test aux4 commands themselves using `.test.md` files. This is particularly useful for testing custom aux4 plugins or validating aux4 behavior.

### Setting up aux4 Commands for Testing

To test aux4 commands, you typically need a `.aux4` file that defines the command behavior. Here's an example of testing a simple greeting command:

````markdown
# aux4 Hello Command Test

## Setup aux4 command

```file:.aux4
{
  "profiles": [
    {
      "name": "main",
      "commands": [
        {
          "name": "hello",
          "execute": [
            "echo \"Hello, ${name}\""
          ],
          "help": {
            "text": "Simple greeting command",
            "variables": [
              {
                "name": "name",
                "text": "Name to greet"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

### Test greeting command

```execute
aux4 hello --name John
```

```expect
Hello, John
```

### Test with different name

```execute
aux4 hello --name "Alice Smith"
```

```expect
Hello, Alice Smith
```
````

## License

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./license)
