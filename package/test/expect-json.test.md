# Expect JSON Modifier

Tests for expect:json and error:json modifiers to verify JSON formatting of command output before comparison.

## Basic JSON Object

```execute
echo '{"name":"John","age":30}'
```

```expect:json
{
  "name": "John",
  "age": 30
}
```

## JSON with Nested Objects

```execute
echo '{"user":{"name":"Alice","address":{"city":"NYC","zip":"10001"}}}'
```

```expect:json
{
  "user": {
    "name": "Alice",
    "address": {
      "city": "NYC",
      "zip": "10001"
    }
  }
}
```

## JSON Array

```execute
echo '[{"id":1,"name":"a"},{"id":2,"name":"b"}]'
```

```expect:json
[
  {
    "id": 1,
    "name": "a"
  },
  {
    "id": 2,
    "name": "b"
  }
]
```

## JSON Combined with Partial

```execute
echo '{"status":"ok","data":{"count":42,"items":["x","y"]}}'
```

```expect:json:partial
"count": 42
```

## JSON Combined with IgnoreCase

```execute
echo '{"message":"Hello World"}'
```

```expect:json:ignoreCase
{
  "message": "hello world"
}
```

## JSON Combined with Regex

```execute
echo '{"id":"abc-123","timestamp":"2025-01-15T10:30:00Z"}'
```

```expect:json:regex
"id": "[a-z]+-\d+"
```

## Error JSON

```execute
echo '{"error":"not found","code":404}' >&2
```

```error:json
{
  "error": "not found",
  "code": 404
}
```

## Simple JSON Array of Strings

```execute
echo '["apple","banana","cherry"]'
```

```expect:json
[
  "apple",
  "banana",
  "cherry"
]
```

## JSON with Boolean and Null Values

```execute
echo '{"active":true,"deleted":false,"notes":null}'
```

```expect:json
{
  "active": true,
  "deleted": false,
  "notes": null
}
```
