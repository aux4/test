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

## Test Addition with File

### Create Sample File and Add Test

```file:sample-file.txt
This is sample content for testing
```

```execute
echo "# Test Suite" > my-test-suite.test.md && aux4 test add my-test-suite.test.md --level 2 --name "File Content Test" --file sample-file.txt --execute "cat sample-file.txt"
```

```execute
cat my-test-suite.test.md
```

````expect
# Test Suite

## File Content Test

```file:sample-file.txt
This is sample content for testing
```

```execute
cat sample-file.txt
```

```expect
This is sample content for testing
```

````

## Test Addition with Multiple Files

### Create Multiple Files and Add Test

```file:sample-file.txt
This is sample content for testing
```

```file:another-file.js
console.log("Hello from JavaScript");
```

```execute
echo "# Test Suite" > my-test-suite.test.md && aux4 test add my-test-suite.test.md --level 3 --name "Multiple Files Test" --file sample-file.txt --file another-file.js --execute "echo Processing files"
```

```execute
cat my-test-suite.test.md
```

````expect
# Test Suite

### Multiple Files Test

```file:sample-file.txt
This is sample content for testing
```

```file:another-file.js
console.log("Hello from JavaScript");
```

```execute
echo Processing files
```

```expect
Processing files
```

````

## Test Different Heading Levels

### Add Level 1 Test

```execute
test -f my-test-suite.test.md || echo "# Test Suite" > my-test-suite.test.md && aux4 test add my-test-suite.test.md --level 1 --name "Major Section" --execute "echo Major test section"
```

```execute
tail -n 10 my-test-suite.test.md
```

````expect:partial
# Major Section

```execute
echo Major test section
```
````

### Add Level 4 Test

```execute
echo "# Test Suite" > my-test-suite.test.md && aux4 test add my-test-suite.test.md --level 4 --name "Detailed Subsection" --execute "echo Detailed test"
```

```execute
tail -n 10 my-test-suite.test.md
```

````expect
#### Detailed Subsection

```execute
echo Detailed test
```

```expect
Detailed test
```

````

## Test Only Execute (No Files)

### Add Execute-Only Test

```execute
test -f my-test-suite.test.md || echo "# Test Suite" > my-test-suite.test.md && aux4 test add my-test-suite.test.md --level 2 --name "Execute Only Test" --execute "date +%Y"
```

```execute
tail -n 10 my-test-suite.test.md
```

````expect:partial
## Execute Only Test

```execute
date +%Y
```
````

## Verify Complete Test File Structure

### Build Complete Test File

```file:sample-file.txt
This is sample content for testing
```

```file:another-file.js
console.log("Hello from JavaScript");
```

```execute
echo "# Test Suite" > my-test-suite.test.md &&
aux4 test add my-test-suite.test.md --level 2 --name "Simple Echo Test" --execute "echo Hello World" &&
aux4 test add my-test-suite.test.md --level 2 --name "File Content Test" --file sample-file.txt --execute "cat sample-file.txt" &&
aux4 test add my-test-suite.test.md --level 3 --name "Multiple Files Test" --file sample-file.txt --file another-file.js --execute "echo Processing files" &&
aux4 test add my-test-suite.test.md --level 1 --name "Major Section" --execute "echo Major test section" &&
aux4 test add my-test-suite.test.md --level 4 --name "Detailed Subsection" --execute "echo Detailed test" &&
aux4 test add my-test-suite.test.md --level 2 --name "Execute Only Test" --execute "date +%Y"
```

### Check Final Test File Content

```execute
cat my-test-suite.test.md
```

```expect:partial
# Test Suite
```

```expect:partial
## Simple Echo Test
```

```expect:partial
## File Content Test
```

```expect:partial
### Multiple Files Test
```

```expect:partial
# Major Section
```

```expect:partial
#### Detailed Subsection
```

```expect:partial
## Execute Only Test
```
