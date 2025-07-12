# Expect Modifiers Test

## Basic expect (should work as before)

- should print "Hello World" exactly

```execute
echo "Hello World"
```

```expect
Hello World
```

## Ignore case expect

- should match ignoring case

```execute
echo "Hello World"
```

```expect:ignoreCase
hello world
```

## Partial expect

- should match partial string

```execute
echo "Hello World from the tests"
```

```expect:partial
Hello World
```

## Combined partial and ignore case

- should match partial string ignoring case

```execute
echo "Hello World from the tests"
```

```expect:partial:ignoreCase
hello world
```

## Another combined test

- should match with both modifiers in different order

```execute
echo "The Quick BROWN Fox"
```

```expect:ignoreCase:partial
quick brown
```