---
name: deployment-guard
description: Pre-deployment validation and safety checks. Use when preparing to deploy, before releasing to production, or when the user mentions deployment, release, or going live.
---

# Deployment Guard

Ensures code is production-ready before deployment.

## When to Use
- User says "deploy", "release", "go live", "push to production"
- Before any deployment command is executed
- When reviewing code for production readiness

## Pre-Deployment Checklist

Copy and work through this checklist:

```markdown
## Deployment Readiness Check

### Code Quality
- [ ] All tests pass (`npm test` / `npm run test`)
- [ ] No TypeScript/ESLint errors (`npm run lint`)
- [ ] Build succeeds without warnings (`npm run build`)

### Debug Cleanup
- [ ] No `console.log` statements in production code
- [ ] No `debugger` statements
- [ ] No commented-out code blocks
- [ ] No TODO comments that block release

### Environment
- [ ] All required environment variables are set
- [ ] Secrets are not hardcoded
- [ ] `.env.example` is up to date
- [ ] Production database connection is configured

### Security
- [ ] No exposed API keys or credentials
- [ ] Authentication is properly enforced
- [ ] CORS is correctly configured
- [ ] Input validation is in place

### Performance
- [ ] Images are optimized
- [ ] Large dependencies are code-split
- [ ] No obvious N+1 queries

### Documentation
- [ ] README is current
- [ ] API changes are documented
- [ ] Changelog is updated
```

## Validation Commands

Run these before deploying:

```bash
# Check for debug statements
grep -r "console.log\|debugger" --include="*.ts" --include="*.tsx" --include="*.js" src/

# Run full test suite
npm test

# Build and check for errors
npm run build

# Check for uncommitted changes
git status
```

## Abort Conditions

**STOP deployment if:**
- Any tests fail
- Build produces errors
- Uncommitted changes exist
- Environment variables are missing
- Security vulnerabilities are detected
