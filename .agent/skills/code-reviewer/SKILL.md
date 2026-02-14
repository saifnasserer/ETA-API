---
name: code-reviewer
description: Provides systematic code review guidelines and checklists. Use when reviewing pull requests, auditing code quality, or when the user asks for a code review.
---

# Code Reviewer

Systematic approach to reviewing code for quality, security, and maintainability.

## When to Use
- User asks to "review this code" or "check this PR"
- Auditing code quality before merge
- Reviewing changes for best practices

## Review Checklist

```markdown
## Code Review: [File/PR Name]

### Correctness
- [ ] Logic is correct and handles edge cases
- [ ] Error handling is appropriate
- [ ] No obvious bugs or race conditions

### Readability
- [ ] Functions are small and focused (< 50 lines)
- [ ] Variable/function names are descriptive
- [ ] Complex logic has explanatory comments
- [ ] No magic numbers (use named constants)

### Security
- [ ] User input is validated/sanitized
- [ ] SQL queries use parameterized statements
- [ ] No sensitive data in logs
- [ ] Auth checks are in place

### Performance
- [ ] No unnecessary loops or iterations
- [ ] Database queries are optimized
- [ ] Async operations are properly awaited
- [ ] No memory leaks (cleanup in useEffect, etc.)

### Testing
- [ ] New code has test coverage
- [ ] Edge cases are tested
- [ ] Tests are meaningful (not just for coverage)

### Style
- [ ] Follows project conventions
- [ ] No unused imports/variables
- [ ] Consistent formatting
```

## Review Output Format

When reviewing code, structure feedback as:

```markdown
## Summary
[One-line summary of the change]

## Approval Status
🟢 Approved | 🟡 Approved with suggestions | 🔴 Changes requested

## Issues Found

### Critical (must fix)
- [Issue description + suggested fix]

### Suggestions (nice to have)
- [Suggestion description]

## Positive Highlights
- [What was done well]
```

## Review Principles

- **Be constructive**: Suggest solutions, not just problems
- **Be specific**: Point to exact lines, provide examples
- **Be kind**: Assume good intent, praise good work
- **Prioritize**: Focus on critical issues first
