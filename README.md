# @aux4/test
Test aux4

![npm](https://img.shields.io/npm/v/@aux4/test)

## Install

```bash
npm install --save-dev @aux4/test
```

## Usage
```bash
$ aux4-test
       run   <files> run test
  coverage   <files> run test coverage
```

### Create test file with `.test.md` extension

````markdown
# Print

## Given Hello World

- should print "Hello World"

```execute
echo 'Hello World'
```

```expect
Hello World
```

## Given Hello my friend

- should print "Hello my friend"

```execute
echo 'Hello my friend'
```

```expect
Hello my friend
```
````

### Run test

```bash
aux4-test run my-test-file.test.md
```

To run all the test files in the current directory.

```bash
aux4-test run
```

### Run test with coverage
This is useful in case your test interact with `js` files.

```bash
aux4-test coverage my-test-file.test.md
```