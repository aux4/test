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
- **`execute:<handler>`** / **`expect:<handler>`** — runs the block's content through a configured handler command instead of shell/stdout comparison (see Custom Block Handlers below)

Modifiers can be combined: `expect:regex:ignoreCase`, `expect:json:partial`, `expect:similar:ignoreCase`.

### Custom Block Handlers

`execute:<handler>` writes the block's content to a temp file and runs a handler command template
over it (`{{file}}` is replaced with the temp file path), using the handler's stdout/stderr/exit
code exactly like a plain `execute` block. `expect:<handler>` does the same but passes or fails
on the handler's exit code instead of comparing text to stdout — useful for keeping assertions
readable (e.g. natural-language playbook assertions) separate from the `execute` block's actions.

A handler is resolved by name against a `block_<handler>` config key, falling back to a built-in
default if none is configured. The only built-in handler is `playbook`:

```yaml
config:
  my-section:
    block_playbook: "aux4 playbook execute {{file}} --loadActions browser"  # built-in default
    block_shell: "bash {{file}}"                                            # a custom handler
```

Using `playbook` requires [`aux4/playbook`](https://hub.aux4.io) (and, for browser steps,
`aux4/browser`) to be installed.

Timeout precedence for a step (most specific first): a `timeout` block on the test, a `timeout`
block on the scenario, `block_<handler>_timeout` from config, `timeout` from config, then the
30-second AI default if the test has an `expect:ai`/`expect:ai:score` block.

An `expect:<suffix>` suffix that isn't one of the known modifiers (`ignoreCase`, `partial`,
`regex`, `json`, `ai`, `score`, `similar`) is always resolved as a handler name — never silently
ignored. An unconfigured handler (including a typo of a known modifier, e.g. `expect:partail`)
fails the test with a clear "Unknown execute handler" message naming the block. Two or more
unrecognized suffix tokens (e.g. `expect:partail:ignorCase`) fail at parse time with an
"Ambiguous expect block" error listing the known modifiers.

Temp files are created uniquely per call with owner-only (`0600`) permissions and removed after
the handler runs, whether it succeeds or fails. The temp file path is shell-quoted, so it's safe
even when the OS temp directory contains spaces.

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
