# Execute/Expect Basic Functionality

Tests for basic execute and expect blocks to verify command execution and output validation.

## Simple Echo Test

```execute
echo "Hello World"
```

```expect
Hello World
```

## Multi-line Output

```execute
printf "Line 1\nLine 2\nLine 3\n"
```

```expect
Line 1
Line 2
Line 3
```

## Error Output Test

```execute
echo "Error message" >&2
```

```error
Error message
```

## Combined Output and Error

```execute
echo "Success output" && echo "Error output" >&2
```

```expect
Success output
```

```error
Error output
```

## Environment Variable Test

```execute
MESSAGE="Test Variable" && echo "$MESSAGE"
```

```expect
Test Variable
```