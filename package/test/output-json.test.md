# Output JSON

## should write json results

```afterAll
rm -f /tmp/aux4-test-output-results.json
```

### should produce json with expect result

```execute
aux4 test run execute-expect.test.md --output /tmp/aux4-test-output-results.json 2>/dev/null
cat /tmp/aux4-test-output-results.json
```

```expect:partial
"timestamp"*?
```

### should include summary

```execute
cat /tmp/aux4-test-output-results.json
```

```expect:partial
"total"*?
```

### should include passed count

```execute
cat /tmp/aux4-test-output-results.json
```

```expect:partial
"passed"*?
```

### should include test entries

```execute
cat /tmp/aux4-test-output-results.json
```

```expect:partial
"tests"*?
```
