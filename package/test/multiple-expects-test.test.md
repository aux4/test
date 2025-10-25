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
