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

### Test 3 - Verify Directory Still Exists

```execute
ls test-dir/
```

```expect
setup.log
```

## Multiple File Creation Test

### Test with Multiple Files

```file:file1.txt
Content of file 1
```

```file:file2.txt
Content of file 2
```

```execute
cat file1.txt file2.txt
```

```expect
Content of file 1Content of file 2
```

### Verify Files Are Cleaned Up Between Tests

```execute
ls *.txt 2>/dev/null | wc -l | tr -d ' '
```

```expect
0
```