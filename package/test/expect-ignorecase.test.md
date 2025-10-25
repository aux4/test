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

## Complex Mixed Case

```execute
echo "The Quick Brown Fox Jumps"
```

```expect:ignoreCase
the quick brown fox jumps
```

## Case Insensitive Error Match

```execute
echo "ERROR: File Not Found" >&2
```

```error:ignoreCase
error: file not found
```

## Combined with Multiple Lines

```execute
printf "First Line\nSECOND LINE\nThird Line\n"
```

```expect:ignoreCase
first line
SECOND LINE
third line
```

## Alphanumeric Case Insensitive

```execute
echo "Version 1.2.3-BETA"
```

```expect:ignoreCase
version 1.2.3-beta
```

## Special Characters with Case

```execute
echo "SUCCESS: Operation Completed!"
```

```expect:ignoreCase
success: operation completed!
```

## Combined Modifiers - Regex and IgnoreCase

```execute
echo "Error Code: ABC123"
```

```expect:regex:ignoreCase
error code: [a-z]+\d+
```