---
description: Triage an issue, bug report, or stack trace into a classified, reproducible work item ready for planning.
argument-hint: [issue-number | description | pasted stack trace]
allowed-tools: Read, Grep, Glob, Bash(git log:*), Bash(git diff:*), Bash(gh issue view:*), Bash(rg:*)
---

## Repository state

- Branch: !`git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "not a git repo"`
- Recent commits: !`git log --oneline -5 2>/dev/null || echo "none"`

## Task

Triage this work item: **$ARGUMENTS**

Delegate to the `triage` subagent. It should produce an intent record at
`.claude/sdlc/intent/<slug>.md` following the format in its instructions.

If `$ARGUMENTS` looks like an issue number, fetch the issue first with
`gh issue view`. If it is a stack trace, start from the topmost frame that
belongs to this repository.

When the record is written, print: the classification line (type, severity,
confidence), the root cause in one sentence, and the single next command to run
(usually `/spec <slug>`, or `/plan <slug>` for work that needs no spec).
