# Timeout Functionality

Tests for timeout configuration to verify that long-running tests can be properly configured.

## Fast Command Test

```timeout
1000
```

```execute
echo "Quick command"
```

```expect
Quick command
```

## Medium Timeout Test

```timeout
5000
```

```execute
sleep 1 && echo "Command completed after 1 second"
```

```expect
Command completed after 1 second
```

## Long Timeout Test

```timeout
10000
```

```execute
sleep 2 && echo "Command completed after 2 seconds"
```

```expect
Command completed after 2 seconds
```

## Default Timeout Test

This test should use the default Jest timeout (no timeout block specified).

```execute
echo "Using default timeout"
```

```expect
Using default timeout
```