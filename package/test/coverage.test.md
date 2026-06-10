# Coverage Report

Tests for the coverage report renderer. Uses the node script directly to avoid aux4 binary startup overhead.

## report from coverage JSON

```file:coverage-data.json
{
  "timestamp": "2026-06-09T12:00:00Z",
  "steps": [
    {
      "package": "test/app@1.0.0",
      "profile": "main",
      "command": "build",
      "index": 0,
      "step": "echo building",
      "hits": 2,
      "durations": [5, 10]
    },
    {
      "package": "test/app@1.0.0",
      "profile": "main",
      "command": "build",
      "index": 1,
      "step": "echo done",
      "hits": 2,
      "durations": [1, 1]
    },
    {
      "package": "test/app@1.0.0",
      "profile": "main",
      "command": "deploy",
      "index": 0,
      "step": "echo deploying",
      "hits": 1,
      "durations": [20]
    },
    {
      "package": "test/app@1.0.0",
      "profile": "main",
      "command": "deploy",
      "index": 1,
      "step": "echo notifying",
      "hits": 0,
      "durations": []
    }
  ]
}
```

```afterAll
rm -f coverage-data.json
```

### should display report with header, package, steps and summary

```execute
node ../lib/aux4-test.js report coverage-data.json
```

```expect:partial
Coverage Report
```

```expect:partial
test/app@1.0.0
```

```expect:partial
2/2 steps
```

```expect:partial
100%
```

```expect:partial
Summary:
```

```expect:partial
Commands:
```

```expect:partial
Steps:
```

```expect:partial
Slowest commands:
```

### should show uncovered steps with percentage

```execute
node ../lib/aux4-test.js report coverage-data.json
```

```expect:regex
.*1/2 steps.*50%.*
```

## report with branch coverage

```file:coverage-branches.json
{
  "timestamp": "2026-06-09T12:00:00Z",
  "steps": [
    {
      "package": "test/app@1.0.0",
      "profile": "main",
      "command": "deploy",
      "index": 0,
      "step": "when:${env}=prod:backup-db",
      "hits": 1,
      "durations": [5],
      "branches": {
        "false": 1
      }
    }
  ]
}
```

```afterAll
rm -f coverage-branches.json
```

### should show branch coverage and missing branches

```execute
node ../lib/aux4-test.js report coverage-branches.json
```

```expect:partial
Branches:
```

```expect:partial
missing: true
```

## report with iteration data

```file:coverage-iterations.json
{
  "timestamp": "2026-06-09T12:00:00Z",
  "steps": [
    {
      "package": "test/app@1.0.0",
      "profile": "main",
      "command": "process",
      "index": 0,
      "step": "each:handle ${item}",
      "hits": 1,
      "durations": [100],
      "iterations": [
        {
          "count": 5,
          "durations": [10, 20, 30, 20, 20]
        }
      ]
    }
  ]
}
```

```afterAll
rm -f coverage-iterations.json
```

### should show iteration count and average

```execute
node ../lib/aux4-test.js report coverage-iterations.json
```

```expect:partial
5 iterations
```

```expect:partial
avg
```

## report with missing file

### should display error for missing coverage file

```execute
node ../lib/aux4-test.js report nonexistent-file.json
```

```error
No coverage data found.
```

## report scans local aux4 files

```file:.aux4
{
  "profiles": [
    {
      "name": "main",
      "commands": [
        {
          "name": "hello",
          "execute": [
            "echo hello"
          ],
          "help": {
            "text": "Say hello"
          }
        }
      ]
    }
  ]
}
```

```file:coverage-local.json
{
  "timestamp": "2026-06-09T12:00:00Z",
  "steps": []
}
```

```afterAll
rm -f coverage-local.json
```

### should show uncovered local commands

```execute
node ../lib/aux4-test.js report coverage-local.json
```

```expect:partial
main/hello
```

```expect:partial
0/1 steps
```
