# Expect Similar Modifier

## Inline reference with fuzzy metric

### should match similar text

```execute
echo "Hello World"
```

```expect:similar
metric: fuzzy
pass: 0.5
---
Hello World
```

### should match close text

```execute
echo "Hello World!"
```

```expect:similar
metric: fuzzy
pass: 0.8
---
Hello World
```

## File reference

```file:expected/greeting.txt
Hello World
```

### should match against file reference

```execute
echo "Hello World"
```

```expect:similar
metric: fuzzy
pass: 0.9
file: expected/greeting.txt
```

## Jaccard metric

### should match same words

```execute
echo "the quick brown fox"
```

```expect:similar
metric: jaccard
pass: 0.5
---
quick fox brown the
```

## Cosine metric

### should match similar word distributions

```execute
echo "the cat sat on the mat"
```

```expect:similar
metric: cosine
pass: 0.4
---
a cat sat on a mat
```

## Combined with ignoreCase

### should match case-insensitively

```execute
echo "HELLO WORLD"
```

```expect:similar:ignoreCase
metric: fuzzy
pass: 0.9
---
hello world
```

## Named scores

### should include name in output

```execute
echo "Hello World"
```

```expect:similar
name: greeting-match
metric: fuzzy
pass: 0.9
---
Hello World
```
