# Expect Partial Modifier

Tests for expect:partial modifier to verify substring matching and wildcard pattern matching.

## Simple Substring Match

```execute
echo "This is a long output with many words"
```

```expect:partial
long output
```

## Beginning Substring

```execute
echo "Hello World from the test"
```

```expect:partial
Hello World
```

## Ending Substring

```execute
echo "This is the end of message"
```

```expect:partial
end of message
```

## Wildcard Pattern with *?

```execute
echo "Start middle end"
```

```expect:partial
Start *? end
```

## Multiple Wildcard Patterns

```execute
echo "File: test.txt Size: 1024 bytes"
```

```expect:partial
File: *? Size: *? bytes
```

## Partial Match in Error Output

```execute
echo "Error: Something went wrong in the process" >&2
```

```error:partial
Something went wrong
```

## Wildcard with Specific Text

```execute
echo "Processing file config.json at 2024-01-01 10:30:00"
```

```expect:partial
Processing file *? at *?
```

## Single Word Partial Match

```execute
echo "The quick brown fox jumps over the lazy dog"
```

```expect:partial
brown fox
```

## Partial Match with Numbers

```execute
echo "Version 1.2.3 build 456 released"
```

```expect:partial
build 456
```