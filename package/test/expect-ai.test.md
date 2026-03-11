# Expect AI Modifier

Tests for expect:ai and error:ai modifiers that use AI to validate command output.

Run with: `aux4 test run test/expect-ai.test.md --configFile test/config.yaml --aiConfig agent`

Requires `OPENAI_API_KEY` environment variable to be set.

## Basic Stdout Validation

```execute
echo "Hello, my name is Alice and I am happy to meet you!"
```

```expect:ai
The output should be a friendly greeting message that includes a person's name
```

## JSON Output Validation

```execute
echo '{"name": "Bob", "age": 30, "email": "bob@example.com"}'
```

```expect:ai
The output should be valid JSON containing a person's name, age, and email address
```

## Stderr Validation

```execute
echo "Error: file config.yaml not found" >&2
```

```error:ai
The output should be an error message about a missing file
```

## Multiple AI Expects

```execute
echo "Total: 3 items processed successfully"
```

```expect:ai
The output should indicate that items were processed
```

```expect:ai
The output should mention a numeric count of items
```
