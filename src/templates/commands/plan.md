---
description: Produce a reviewable, step-by-step implementation plan grounded in the real codebase before any code is written.
argument-hint: [ticket-id | triage-slug | description of the change]
allowed-tools: Read, Grep, Glob, Bash(git log:*), Bash(git diff:*), Bash(git status:*), Bash(gh issue view:*), Bash(rg:*)
---

## Repository state

- Branch: !`git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "not a git repo"`
- Working tree: !`git status --short 2>/dev/null | head -20 || echo "clean"`

## Task

Plan this change: **$ARGUMENTS**

Delegate to the `planner` subagent.

1. Read `.claude/sdlc/specs/$ARGUMENTS.md` if it exists, otherwise
   `.claude/sdlc/intent/$ARGUMENTS.md`. That artifact is the input to this stage.
2. If `$ARGUMENTS` looks like an issue number, read the issue with `gh issue view`.
3. The planner writes the plan to `.claude/sdlc/plans/<slug>.md`.

Do not write or edit any source file during this command. Planning is read-only.

When the plan is written, print: the goal, the chosen approach in one line, the
step count, and the riskiest step. Then stop and let me review it before
`/implement` runs.
