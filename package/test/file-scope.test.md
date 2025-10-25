# File Block Scope Testing

Tests to verify that files created in ```file blocks are available for nested tests but not for tests at the same level.

## Parent Scenario with File

```file:parent-file.txt
This file is created at parent level
```

### Nested Test 1 - File Should Be Available

```execute
cat parent-file.txt
```

```expect
This file is created at parent level
```

### Nested Test 2 - File Still Available in Same Parent

```execute
ls parent-file.txt
```

```expect
parent-file.txt
```

#### Deeply Nested Test - File Should Still Be Available

```execute
echo "File exists: $(test -f parent-file.txt && echo yes || echo no)"
```

```expect
File exists: yes
```

## Sibling Scenario - File Should NOT Be Available

This scenario is at the same level as "Parent Scenario with File", so the parent-file.txt should not be available here.

```execute
ls parent-file.txt 2>/dev/null || echo "File not found"
```

```expect
File not found
```

### Create New File in Sibling Scenario

```file:sibling-file.txt
This file is created in sibling scenario
```

```execute
cat sibling-file.txt
```

```expect
This file is created in sibling scenario
```

## Another Sibling - Neither File Should Be Available

```execute
(ls parent-file.txt 2>/dev/null && echo "parent exists") || echo "parent missing"
```

```expect
parent missing
```

```execute
(ls sibling-file.txt 2>/dev/null && echo "sibling exists") || echo "sibling missing"
```

```expect
sibling missing
```

### Create File in This Scenario

```file:third-file.txt
Third scenario file content
```

#### Nested Test - All Previous Files Should Be Missing, Only Current Available

```execute
echo "Parent file: $(test -f parent-file.txt && echo exists || echo missing)"
```

```expect
Parent file: missing
```

```execute
echo "Sibling file: $(test -f sibling-file.txt && echo exists || echo missing)"
```

```expect
Sibling file: missing
```

```execute
echo "Third file: $(test -f third-file.txt && echo exists || echo missing)"
```

```expect
Third file: exists
```

```execute
cat third-file.txt
```

```expect
Third scenario file content
```