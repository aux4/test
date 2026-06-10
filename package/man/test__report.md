#### Description

The `report` command renders a coverage report from a previously collected JSON coverage file. Use this to view coverage data collected via the `AUX4_COVERAGE_FILE` environment variable from any `aux4` invocation — not just tests.

The report scans the specified directory for `.aux4` files to build the full universe of commands and steps, then overlays the coverage data to show what was hit and what was missed.

#### Usage

```bash
aux4 test report <file> [--dir <path>]
```

--file  Path to the coverage JSON file (required)
--dir   Directory to scan for .aux4 files (default: `.`)

#### Example

```bash
# Collect coverage from commands
AUX4_COVERAGE_FILE=cov.json aux4 build
AUX4_COVERAGE_FILE=cov.json aux4 test run .

# View the report
aux4 test report cov.json

# Scan a different directory for .aux4 files
aux4 test report cov.json --dir ./packages/my-app
```

#### Coverage JSON Format

The coverage file is a JSON document with the following structure:

```json
{
  "timestamp": "2026-06-09T12:00:00Z",
  "steps": [
    {
      "package": "my-scope/my-app@1.0.0",
      "profile": "main",
      "command": "build",
      "index": 0,
      "step": "echo building",
      "hits": 3,
      "durations": [5, 8, 6],
      "branches": { "true": 2, "false": 1 },
      "iterations": [
        { "count": 10, "durations": [1, 2, 1, 3, 1, 2, 1, 1, 2, 1] }
      ]
    }
  ]
}
```

Fields:

- `hits` — number of times this step was executed
- `durations` — execution time in milliseconds for each hit
- `branches` — for `when:` steps, count of true/false evaluations
- `iterations` — for `each:` steps, iteration count and per-iteration durations per hit

Multiple runs writing to the same file are automatically merged.
