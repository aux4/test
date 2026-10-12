# Release notes

## 0.2.25

Add custom block handlers: `execute:<handler>` and `expect:<handler>` write a block's content to
a secure temp file and run it through a configured `block_<handler>` command (falling back to a
built-in `playbook` handler), so a step can be authored in another language instead of shell, and
assertions can live in a separate readable `expect:<handler>` block judged by exit code. Adds
`block_<handler>_timeout` and file-wide `timeout` config as new rungs in the timeout precedence
chain. An unconfigured handler — including a typo of a known `expect` modifier — fails the test
loudly instead of being silently ignored or mistaken for a modifier. Temp files are created
uniquely with owner-only permissions, shell-quoted for paths with spaces, and always removed.
