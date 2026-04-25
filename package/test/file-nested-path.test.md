# File Nested Path

## should create nested directories for file blocks

```file:nested/deep/config.yaml
host: localhost
port: 3000
```

### should read the nested file

```execute
cat nested/deep/config.yaml
```

```expect
host: localhost
port: 3000
```
