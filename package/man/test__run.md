#### Description

The `run` command executes `.test.md` files and validates command output against expectations. It supports multiple assertion types:

- **`expect`** — exact stdout match
- **`expect:partial`** — substring/wildcard match (`*`, `*?`, `**`)
- **`expect:regex`** — regex match
- **`expect:ignoreCase`** — case-insensitive match
- **`expect:json`** — JSON formatting before comparison
- **`expect:ai`** — LLM-based pass/fail validation (requires `--aiConfig`)
- **`expect:ai:score`** — LLM-as-a-judge numeric scoring (requires `--aiConfig`)
- **`expect:similar`** — deterministic text similarity (fuzzy, cosine, jaccard)
- **`error`** / **`error:*`** — same modifiers for stderr
- **`dataset`** — data-driven tests: repeats the entire scenario once per entry in a JSON array, substituting `{{variable}}` placeholders from each entry

Modifiers can be combined: `expect:regex:ignoreCase`, `expect:json:partial`, `expect:similar:ignoreCase`.

Dataset blocks support a config form (`file`, `root`, `key` fields) and a shorthand form (`dataset:path/to/file.json`). The `root` field accepts JSONPath expressions to extract arrays from nested JSON. Nested datasets produce a cartesian product. Dataset variables override config variables when keys collide.

The `--output` flag writes structured JSON results including scores, assertion outcomes, and timing.

#### Usage

```bash
aux4 test run <dir> [--configFile <path>] [--config <section>] [--aiConfig <section>] [--group <name>] [--output <file>]
```

--dir         Directory or file with .test.md files (default: `.`)
--configFile  Path to config file for variable substitution
--config      Config section name
--aiConfig    Config section for AI agent (used by `expect:ai` and `expect:ai:score`)
--group       Run only tests from specified group(s)
--output      Write structured JSON results to this file

#### Example

```bash
# Run all tests
aux4 test run test/

# Run with AI scoring
aux4 test run test/ --aiConfig agent --configFile config.yaml

# Run with JSON output
aux4 test run test/ --output results.json

# Run specific file
aux4 test run test/my-feature.test.md
```

Dataset-driven test example (`.test.md`):

````markdown
## should add numbers

```dataset
file: dataset/math.json
key: id
```

```execute
echo $(({{a}} + {{b}}))
```

```expect
{{result}}
```
````

Where `dataset/math.json`:

```json
[
  {"id": "positive", "a": 1, "b": 2, "result": "3"},
  {"id": "negative", "a": -5, "b": 5, "result": "0"}
]
```

```text
1.1. should add numbers [positive]
  ✓ 1. should print output
1.1. should add numbers [negative]
  ✓ 1. should print output
```
