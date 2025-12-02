# Expect Multiline Wildcard Tests

Tests for the ** multiline wildcard pattern in expect:partial modifier.

## Simple Multiline Match

```execute
echo -e "Start\nMiddle content\nEnd"
```

```expect:partial
Start**End
```

## Multiline with Specific Content

```execute
echo -e "Beginning\nSome important data\nMore content\nFinal line"
```

```expect:partial
Beginning**important data**Final line
```

## Mixed Wildcards - ** and *?

```execute
echo -e "File: test.txt\nSize: 1024 bytes\nModified: today"
```

```expect:partial
File: *?**Modified: *?
```

## Multiline Error Output

```execute
echo -e "Error occurred\nStack trace line 1\nStack trace line 2\nEnd of error" >&2
```

```error:partial
Error occurred**End of error
```

## Complex Multiline Pattern

```execute
echo -e "Header: Important\n\nBody with multiple\nlines of content\n\nFooter: Done"
```

```expect:partial
Header: **Body with**Footer: Done
```

## Single Line with ** (should still work)

```execute
echo "Single line content with spaces"
```

```expect:partial
Single**with spaces
```

## Multiline JSON-like Output

```execute
echo -e "{\n  \"key\": \"value\",\n  \"nested\": {\n    \"item\": \"data\"\n  }\n}"
```

```expect:partial
{**"key": "value"**}
```

## Mixed with Case Insensitive

```execute
echo -e "START\nMiddle Content\nEND"
```

```expect:partial:ignoreCase
start**end
```