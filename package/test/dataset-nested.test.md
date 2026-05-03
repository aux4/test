# Dataset Nested

## should combine prefix and name

```dataset
file: dataset/nested-outer.json
```

### should greet

```dataset
file: dataset/nested-inner.json
```

```execute
echo "{{prefix}}, {{name}}!"
```

```expect:partial
{{prefix}}, {{name}}!
```
