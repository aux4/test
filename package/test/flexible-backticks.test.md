# Flexible Backticks Support

Tests to verify that the test parser supports more than 3 backticks for all block types when dealing with markdown content that contains code blocks.

## Standard 3 Backticks (Should Still Work)

```execute
echo "Standard test"
```

```expect
Standard test
```

## 4 Backticks for Execute/Expect

````execute
printf "This is markdown content with code:\n\`\`\`javascript\nconsole.log(\"hello world\");\n\`\`\`\n"
````

````expect
This is markdown content with code:
```javascript
console.log("hello world");
```
````

## 5 Backticks for Nested Code

`````execute
printf "Test Documentation\n\nHere's a test example:\n\n\`\`\`\`markdown\n\`\`\`execute\necho \"nested example\"\n\`\`\`\n\n\`\`\`expect\nnested example\n\`\`\`\n\`\`\`\`\n"
`````

`````expect
Test Documentation

Here's a test example:

````markdown
```execute
echo "nested example"
```

```expect
nested example
```
````
`````

## File Blocks with 4 Backticks

### Create and Read Markdown File

````file:markdown-sample.md
Sample Markdown

This file contains code blocks:

```bash
echo "Hello World"
```

```javascript
console.log("test");
```
````

````execute
cat markdown-sample.md
````

````expect
Sample Markdown

This file contains code blocks:

```bash
echo "Hello World"
```

```javascript
console.log("test");
```
````

## Error Blocks with 4 Backticks

````execute
printf "Error with code block:\n\`\`\`error\nSomething went wrong\n\`\`\`\n" >&2
````

````error
Error with code block:
```error
Something went wrong
```
````

## Regex Modifier with 4 Backticks

````execute
echo "Generated code: console.log('test123');"
````

````expect:regex
Generated code: console\.log\('test\d+'\);
````

## Partial Modifier with 4 Backticks

````execute
printf "Function definition:\n\`\`\`function\ndef test():\n    return \"success\"\n\`\`\`\nResult: success\n"
````

````expect:partial
Function definition:
```function
def test():
    return "success"
```
Result: success
````

## Timeout with 4 Backticks

````timeout
5000
````

````execute
sleep 1 && echo "Timeout test completed"
````

````expect
Timeout test completed
````