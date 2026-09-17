---
description: Execute an approved plan step by step, matching codebase conventions and keeping the build green.
argument-hint: [plan-slug | description of the change]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, TodoWrite
---

## Repository state

- Branch: !`git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "not a git repo"`
- Working tree: !`git status --short 2>/dev/null | head -20 || echo "clean"`

## Task

Implement: **$ARGUMENTS**

1. Read the plan at `.claude/sdlc/plans/$ARGUMENTS.md` if it exists. If no plan
   exists and the change is more than a one-file edit, run `/plan` first and say so.
2. If the current branch is `main`, `master`, or `develop`, create a working
   branch before the first edit.
3. Delegate to the `developer` subagent, or implement directly if the change is
   small enough that delegation adds nothing.
4. Track the plan's steps with TodoWrite and finish them one at a time.
5. Verify with the project's own commands:
{{#if typecheck}}
   - `{{typecheck}}`
{{/if}}
{{#if lint}}
   - `{{lint}}`
{{/if}}
   - `{{test}}`

Report what changed with `file:line` references, the verification output as it
actually came back, and anything you left undone. Do not claim a green build you
did not see.
