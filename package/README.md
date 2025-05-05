# aux4 test

This tool is used for testing the aux4 CLIs.

## Usage

### Writing a test

The tests are written in markdown format. The file name should have the extension `.test.md`. 
The nested heading levels are used to define the test structure. If you include files, all the nested levels will be able to access the included files.

````markdown
# My first simple test

## Show the content of test.txt file

```file:test.txt
This is a test file
```

```execute
cat test.txt
```

```expect
This is a test file
```
````

### Running a test

To run a test, use the following command:

```bash
> aux4 test run
```

This will run all the tests in the current directory and its subdirectories. The results will be printed to the console.

```text
 PASS  test/MarkdownTest.test.js
  Test file my.test.md
    1. My first simple test
      1.1. Show the content of test.txt file
        ✓ 1. should print output (5 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        0.136 s
```
