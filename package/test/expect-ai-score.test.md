# Expect AI Score Modifier

Tests for expect:ai:score modifier that uses AI to score command output.

Run with: `aux4 test run test/expect-ai-score.test.md --configFile test/config.yaml --aiConfig agent`

## Basic Scoring

```execute
echo "Hello, my name is Alice and I am happy to meet you!"
```

```expect:ai:score
name: friendliness
eval: Is the output a friendly greeting?
range: 1-5
pass: 3
```

## Scoring with Default Range

```execute
echo "The capital of France is Paris."
```

```expect:ai:score
name: accuracy
eval: Is the statement factually correct?
```

## Multiple Scores

```execute
echo "To install the package, run: npm install express"
```

```expect:ai:score
name: clarity
eval: Is the instruction clear and easy to follow?
range: 1-5
pass: 3
```

```expect:ai:score
name: completeness
eval: Does the instruction include the full command?
range: 1-5
pass: 3
```
