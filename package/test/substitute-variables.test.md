# Substitute Variables

Tests for `{{varName}}` dynamic parameter substitution with `--configFile` and `--config`.

````file:subst-config.yaml
config:
  test:
    message: hello-world-42
````

## execute block

````file:subst-execute.test.md
# execute substitution

## should echo substituted value

```execute
echo "{{message}}"
```

```expect
hello-world-42
```
````

### should substitute variables in execute command

```timeout
15000
```

```execute
aux4 test run subst-execute.test.md --configFile subst-config.yaml --config test
```

## expect block

````file:subst-expect.test.md
# expect substitution

## should match substituted expected value

```execute
echo "hello-world-42"
```

```expect
{{message}}
```
````

### should substitute variables in expected output

```timeout
15000
```

```execute
aux4 test run subst-expect.test.md --configFile subst-config.yaml --config test
```

## error block

````file:subst-error.test.md
# error substitution

## should match substituted error value

```execute
echo "hello-world-42" >&2; exit 1
```

```error
{{message}}
```
````

### should substitute variables in expected error

```timeout
15000
```

```execute
aux4 test run subst-error.test.md --configFile subst-config.yaml --config test
```

## file content block

````file:subst-file.test.md
# file content substitution

## should write substituted content to file

```file:subst-output.txt
{{message}}
```

```execute
cat subst-output.txt
```

```expect
hello-world-42
```
````

### should substitute variables in file content

```timeout
15000
```

```execute
aux4 test run subst-file.test.md --configFile subst-config.yaml --config test
```

## hook commands

````file:subst-hook.test.md
# hook substitution

## setup

```beforeAll
echo "{{message}}" > subst-hook-output.txt
```

```afterAll
rm -f subst-hook-output.txt
```

### should read substituted hook output

```execute
cat subst-hook-output.txt
```

```expect
hello-world-42
```
````

### should substitute variables in hook commands

```timeout
15000
```

```execute
aux4 test run subst-hook.test.md --configFile subst-config.yaml --config test
```

## unresolved variables

````file:subst-unresolved.test.md
# unresolved variables

## should keep unresolved variables intact

```execute
echo "{{message}} {{undefined}}"
```

```expect
hello-world-42 {{undefined}}
```
````

### should leave unresolved variables as-is

```timeout
15000
```

```execute
aux4 test run subst-unresolved.test.md --configFile subst-config.yaml --config test
```
