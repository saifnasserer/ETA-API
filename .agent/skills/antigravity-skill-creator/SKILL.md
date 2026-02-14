---
name: creating-skills
description: Generates well-structured AntiGravity skills. Use when the user asks to create a new skill, build an agent capability, or define specialized instructions for a task domain.
---

# AntiGravity Skill Creator

Create high-quality, predictable skills that extend agent capabilities.

## When to Use
- User asks to "create a skill" or "build an agent capability"
- User wants to define specialized instructions for a task domain
- User needs to standardize a repetitive workflow

## Folder Structure

Every skill follows this hierarchy:

```
.agent/skills/<skill-name>/
├── SKILL.md          # Required: Main logic and instructions
├── scripts/          # Optional: Helper scripts
├── examples/         # Optional: Reference implementations
└── resources/        # Optional: Templates or assets
```

## YAML Frontmatter Standards

```yaml
---
name: <gerund-name>      # e.g., testing-code, managing-databases
description: <3rd-person description with trigger keywords>
---
```

**Rules:**
- `name`: Gerund form, max 64 chars, lowercase + numbers + hyphens only
- `description`: Third person, include trigger keywords, max 1024 chars

## Writing Principles

- **Conciseness**: Assume intelligence. Focus on unique logic, not explanations
- **Progressive Disclosure**: Keep under 500 lines. Link to secondary files if needed
- **Forward Slashes**: Always use `/` for paths
- **Degrees of Freedom**:
  - Bullet points → High freedom (heuristics)
  - Code blocks → Medium freedom (templates)
  - Specific commands → Low freedom (fragile operations)

## Workflow Patterns

### Checklists
Provide markdown checklists the agent can copy and update:
```markdown
- [ ] Step 1
- [ ] Step 2
```

### Validation Loops
Use "Plan-Validate-Execute" pattern - verify before applying changes.

### Error Handling
Scripts should be "black boxes" - instruct to run `--help` if unsure.

## Output Template

When creating a skill, generate:

```markdown
### [Folder Name]
**Path:** `.agent/skills/[skill-name]/`

### SKILL.md

---
name: [gerund-name]
description: [3rd-person description with triggers]
---

# [Skill Title]

## When to Use
- [Trigger 1]
- [Trigger 2]

## Workflow
[Checklist or step-by-step guide]

## Instructions
[Specific logic, code snippets, or rules]

## Resources
- [Link to scripts/ or resources/ if applicable]
```

### Supporting Files
If needed, also generate content for `scripts/`, `examples/`, or `resources/`.
