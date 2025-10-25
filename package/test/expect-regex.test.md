# Expect Regex Modifier

Tests for expect:regex modifier to verify regular expression matching in output validation.

## Simple Pattern Matching

```execute
echo "Hello World 123"
```

```expect:regex
^Hello World \d+$
```

## Word Boundary Test

```execute
echo "The quick brown fox"
```

```expect:regex
\bquick\b
```

## Multiple Line Regex

```execute
echo -e "Line 1: Start\nLine 2: Middle\nLine 3: End"
```

```expect:regex
Line \d+: \w+
```

## Email Pattern Test

```execute
echo "Contact: user@example.com"
```

```expect:regex
Contact: [a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}
```

## Error Output Regex

```execute
echo "Error: File not found" >&2
```

```error:regex
Error: File .* found
```

## Regex with Special Characters

```execute
echo "Version: 1.2.3-beta"
```

```expect:regex
Version: \d+\.\d+\.\d+(-\w+)?
```

## Case Sensitive Regex

```execute
echo "Hello World"
```

```expect:regex
^Hello World$
```