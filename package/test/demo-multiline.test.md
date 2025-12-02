# Demo: Multiline Wildcard

```execute
echo -e "Header: Processing\n\nMultiple lines\nof output\n\nFooter: Complete"
```

```expect:partial
Header:**Footer: Complete
```