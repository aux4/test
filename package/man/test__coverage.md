#### Description

The `coverage` command runs `.test.md` files and produces a coverage report showing which aux4 execute steps were hit during the test run. It instruments every `aux4` invocation spawned by the tests, tracking:

- **Step coverage** — which execute items in each command were hit
- **Command coverage** — which commands were invoked at least once
- **Branch coverage** — which `when:` conditions were evaluated as both true and false
- **Iteration tracking** — how many times `each:` loops ran and per-iteration durations
- **Duration** — how long each step, command, and iteration took

The coverage report is rendered after the test run completes (even if some tests fail).

Under the hood, the command sets `AUX4_COVERAGE_FILE` to a temporary file, runs the tests normally, then reads the collected coverage data and renders the report.

#### Usage

```bash
aux4 test coverage <dir> [--configFile <path>] [--config <section>] [--aiConfig <section>] [--group <name>] [--output <file>]
```

--dir         Directory or file with .test.md files (default: `.`)
--configFile  Path to config file for variable substitution
--config      Config section name
--aiConfig    Config section for AI agent (used by `expect:ai` and `expect:ai:score`)
--group       Run only tests from specified group(s)
--output      Write structured JSON results to this file

#### Example

```bash
# Run tests with coverage
aux4 test coverage test/

# Run specific tests with coverage
aux4 test coverage test/my-feature.test.md

# Run with AI scoring and coverage
aux4 test coverage test/ --aiConfig agent --configFile config.yaml
```

Sample output:

```text
Coverage Report
======================================================================

  Package: my-app@1.0.0

    main/build          3/3 steps  ████████████ 100%  1.2s
    main/deploy         2/5 steps  █████░░░░░░░  40%  0.3s
      ✗ [2] when:${env}=prod:nout:backup-db
      ✗ [3] nout:notify-slack ${env}
      ✗ [4] log:deployed to ${env}
    main/test           4/4 steps  ████████████ 100%  0.8s

----------------------------------------------------------------------

  Summary:
    Commands:   3/5 (60%)
    Steps:      9/12 (75%)
    Branches:   1/2 (50%)

  Slowest commands:
    main/build          1.2s
    main/test           0.8s
    main/deploy         0.3s

======================================================================
```

#### Standalone Usage

Coverage instrumentation is built into the `aux4` core and works outside of the test framework. Set the `AUX4_COVERAGE_FILE` environment variable to record coverage from any `aux4` command:

```bash
# Record coverage from regular commands
AUX4_COVERAGE_FILE=cov.json aux4 build
AUX4_COVERAGE_FILE=cov.json aux4 deploy --env staging

# Multiple runs merge into the same file
AUX4_COVERAGE_FILE=cov.json aux4 deploy --env prod

# View the report
aux4 test report cov.json
```

Coverage data is flushed on normal exit, Ctrl+C, and panic. The only case that prevents flushing is `SIGKILL` (`kill -9`).

When `AUX4_COVERAGE_FILE` is not set, coverage is completely disabled with zero performance overhead.
