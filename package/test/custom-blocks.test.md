# Custom Block Handlers

Tests for `execute:<handler>` and `expect:<handler>` custom block execution via `block_<handler>`
config, plus the safety/backward-compatibility guarantees around them (unknown handlers, typo'd
modifiers, variable substitution, paths with spaces, temp file cleanup, and timeout precedence).

Since these blocks are configured via `block_<handler>` keys that aren't declared command
variables, each scenario drives a nested `aux4 test run` against a small fixture file created
with a `file:` block, so the fixture's own `--config`/`--configFile` can supply the handler
config without affecting the outer (this) test run.

Nested runs write their `--output` to an absolute `/tmp` path (not a relative one) because the
nested `aux4 test run` process runs with the package directory as its cwd, not this test's
directory — the same reason `test/output-json.test.md` uses an absolute path.

```afterAll
rm -f /tmp/aux4-test-custom-blocks-*.json
```

## execute:<handler> runs the block through a configured handler

````file:fixtures/exec-handler.test.md
# Fixture

## case

```execute:shell
echo "hello from handler"
```

```expect
hello from handler
```
````

```file:fixtures/exec-handler-config.yaml
config:
  blocks:
    block_shell: "bash {{file}}"
```

```execute
aux4 test run fixtures/exec-handler.test.md --config blocks --configFile fixtures/exec-handler-config.yaml --output /tmp/aux4-test-custom-blocks-exec-handler.json 2>/dev/null; cat /tmp/aux4-test-custom-blocks-exec-handler.json
```

```expect:partial
"total": 1,
    "passed": 1,
    "failed": 0
```

## expect:<handler> passes when the handler exits 0

````file:fixtures/expect-pass.test.md
# Fixture

## case

```execute
echo "setup"
```

```expect:checker
exit 0
```
````

```file:fixtures/expect-pass-config.yaml
config:
  blocks:
    block_checker: "bash {{file}}"
```

```execute
aux4 test run fixtures/expect-pass.test.md --config blocks --configFile fixtures/expect-pass-config.yaml --output /tmp/aux4-test-custom-blocks-expect-pass.json 2>/dev/null; cat /tmp/aux4-test-custom-blocks-expect-pass.json
```

```expect:partial
"total": 1,
    "passed": 1,
    "failed": 0
```

## expect:<handler> fails when the handler exits non-zero

````file:fixtures/expect-fail.test.md
# Fixture

## case

```execute
echo "setup"
```

```expect:checker
exit 1
```
````

```file:fixtures/expect-fail-config.yaml
config:
  blocks:
    block_checker: "bash {{file}}"
```

```execute
aux4 test run fixtures/expect-fail.test.md --config blocks --configFile fixtures/expect-fail-config.yaml 2>&1 || true
```

```expect:partial
handler 'checker' exited 1
```

## unknown handler fails with a clear message naming the block and handler

````file:fixtures/unknown-handler.test.md
# Fixture

## case

```execute:ghost
echo "nope"
```

```expect
nope
```
````

```execute
aux4 test run fixtures/unknown-handler.test.md 2>&1 || true
```

```expect:partial
Unknown execute handler 'ghost'. Define it in config as block_ghost
```

## a typo'd modifier is never silently treated as a passing modifier

A suffix that isn't one of the known `expect` modifiers (`ignoreCase`, `partial`, `regex`, `json`,
`ai`, `score`, `similar`) is resolved as a handler name and fails loudly if that handler isn't
configured — so `expect:partail` (typo of `partial`) fails clearly instead of silently matching
or silently passing.

````file:fixtures/typo-modifier.test.md
# Fixture

## case

```execute
echo "x"
```

```expect:partail
x
```
````

```execute
aux4 test run fixtures/typo-modifier.test.md 2>&1 || true
```

```expect:partial
expect:partail failed: Unknown execute handler 'partail'
```

## an ambiguous suffix (two unrecognized tokens) fails with a specific message

````file:fixtures/ambiguous-modifier.test.md
# Fixture

## case

```execute
echo "x"
```

```expect:partail:ignorCase
x
```
````

```execute
aux4 test run fixtures/ambiguous-modifier.test.md 2>&1 || true
```

```expect:partial
Ambiguous expect block 'expect:partail:ignorCase'
```

```expect:partial
Known modifiers are: ignoreCase, partial, regex, json, ai, score, similar
```

## variable substitution works the same in handler blocks as in plain execute

````file:fixtures/substitute.test.md
# Fixture

## case

```execute:shell
echo "{{greeting}}"
```

```expect
{{greeting}}
```
````

```file:fixtures/substitute-config.yaml
config:
  blocks:
    block_shell: "bash {{file}}"
    greeting: hi there
```

```execute
aux4 test run fixtures/substitute.test.md --config blocks --configFile fixtures/substitute-config.yaml --output /tmp/aux4-test-custom-blocks-substitute.json 2>/dev/null; cat /tmp/aux4-test-custom-blocks-substitute.json
```

```expect:partial
"total": 1,
    "passed": 1,
    "failed": 0
```

## the temp file path is shell-quoted, so paths containing spaces still work

The block content is always written to a fresh temp file; this verifies the handler command still
runs correctly even when the OS temp directory itself contains a space.

````file:fixtures/spaces.test.md
# Fixture

## case

```execute:shell
echo "ran ok"
```

```expect:partial
ran ok
```
````

```file:fixtures/spaces-config.yaml
config:
  blocks:
    block_shell: "bash {{file}}"
```

```beforeAll
mkdir -p "/tmp/aux4 test space dir"
```

```afterAll
rm -rf "/tmp/aux4 test space dir"
```

```execute
TMPDIR="/tmp/aux4 test space dir" aux4 test run fixtures/spaces.test.md --config blocks --configFile fixtures/spaces-config.yaml --output /tmp/aux4-test-custom-blocks-spaces.json 2>/dev/null; cat /tmp/aux4-test-custom-blocks-spaces.json
```

```expect:partial
"total": 1,
    "passed": 1,
    "failed": 0
```

## temp files are cleaned up after the block runs, even on success

````file:fixtures/cleanup.test.md
# Fixture

## case

```execute:shell
echo "done"
```

```expect
done
```
````

```file:fixtures/cleanup-config.yaml
config:
  blocks:
    block_shell: "bash {{file}}"
```

```execute
aux4 test run fixtures/cleanup.test.md --config blocks --configFile fixtures/cleanup-config.yaml >/dev/null 2>&1; find "${TMPDIR:-/tmp}" -maxdepth 1 -name "aux4-test-block-*" 2>/dev/null | wc -l | tr -d ' '
```

```expect
0
```

## timeout precedence: a test-level timeout block wins over a shorter block_<handler>_timeout

````file:fixtures/timeout-test-wins.test.md
# Fixture

## case

```timeout
3000
```

```execute:slow
sleep 0.3 && echo done
```

```expect
done
```
````

```file:fixtures/timeout-test-wins-config.yaml
config:
  blocks:
    block_slow: "bash {{file}}"
    block_slow_timeout: 100
    timeout: 5000
```

```execute
aux4 test run fixtures/timeout-test-wins.test.md --config blocks --configFile fixtures/timeout-test-wins-config.yaml --output /tmp/aux4-test-custom-blocks-timeout-test-wins.json 2>/dev/null; cat /tmp/aux4-test-custom-blocks-timeout-test-wins.json
```

```expect:partial
"total": 1,
    "passed": 1,
    "failed": 0
```

## timeout precedence: block_<handler>_timeout applies without a timeout block

Without a `timeout` block, the handler's own `block_<handler>_timeout` kicks in — here it's
deliberately shorter than the handler needs, so the test fails with a timeout, proving the value
is actually being applied (and not just defaulting to Jest's default timeout).

````file:fixtures/timeout-handler-applies.test.md
# Fixture

## case

```execute:slow
sleep 0.3 && echo done
```

```expect
done
```
````

```file:fixtures/timeout-handler-applies-config.yaml
config:
  blocks:
    block_slow: "bash {{file}}"
    block_slow_timeout: 100
```

```execute
aux4 test run fixtures/timeout-handler-applies.test.md --config blocks --configFile fixtures/timeout-handler-applies-config.yaml 2>&1 || true
```

```expect:partial
Exceeded timeout of 100 ms
```

## plain execute/expect blocks are unaffected (backward compatibility)

Blocks without a `:<handler>` suffix behave exactly as before — no handler lookup, no temp file.

```execute
echo "Hello World"
```

```expect
Hello World
```
