# AntiGravity Skills Guide

## What Are Skills?

Skills are specialized instruction sets that extend my capabilities. Each skill contains domain-specific knowledge, workflows, and rules that I follow when triggered.

## Where Do Skills Live?

```
your-project/
└── .agent/
    └── skills/
        ├── skill-name-1/
        │   └── SKILL.md
        └── skill-name-2/
            ├── SKILL.md
            └── resources/
```

> **Important:** Skills are **project-level**, not global. Each project has its own `.agent/skills/` directory.

### Making Skills "Global"

To share skills across projects:
1. Create a central skills repository
2. Symlink to each project: `ln -s /path/to/shared/skills .agent/skills`
3. Or copy skills to each project as needed

## How Skills Are Triggered

### Automatic Detection
I scan skill `description` fields for trigger keywords. If your request matches, I read and follow the skill.

**Example:** Saying "prepare for deployment" triggers `deployment-guard` because its description mentions "deploy" and "release".

### Explicit Invocation
You can directly invoke skills:
- "Use the brand-identity skill"
- "Follow the code-reviewer guidelines"
- "Apply deployment-guard checks"

## Current Skills in This Project

| Skill | Trigger Keywords |
|-------|-----------------|
| `antigravity-skill-creator` | "create a skill", "build agent capability" |
| `brand-identity` | "UI", "styling", "components", "copy", "brand" |
| `deployment-guard` | "deploy", "release", "production", "go live" |
| `code-reviewer` | "review code", "check PR", "audit" |
| `remote-server-management` | "vps", "remote server", "deploy", "ssh" |

## Creating New Skills

Ask me to "create a skill for [your task]" and I'll use the `antigravity-skill-creator` to generate a properly structured skill.

### Good Skill Candidates
- Repetitive workflows you want standardized
- Domain-specific rules (API patterns, database conventions)
- Project-specific guidelines (coding standards, review processes)

## Skill Suggestions for Your Projects

Based on your workspace:

| Skill | Purpose |
|-------|---------|
| `woocommerce-manager` | SEO optimization, product management, bulk operations |
| `eta-tax-integration` | Egyptian Tax Authority API patterns, auth flow |
| `flutter-conventions` | Bakiza app styling, widget patterns, Arabic localization |
| `erp-database-ops` | Safe migrations, backup procedures, query patterns |
| `techflow-agent` | Diagnostic report parsing, hardware spec formatting |
| `api-security` | Auth enforcement, input validation, rate limiting |
