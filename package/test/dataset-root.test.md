# Dataset Root Path

## should greet from nested JSON

```dataset
file: dataset/greetings.json
root: $.data.items
```

```execute
echo "Hello, {{name}}!"
```

```expect
{{greeting}}
```
