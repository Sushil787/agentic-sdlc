---
description: Review the current diff, a branch, or a PR for correctness bugs, missing tests, and convention drift.
argument-hint: [empty for working tree | branch | PR number]
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git log:*), Bash(git status:*), Bash(gh pr:*), Bash(rg:*)
---

## Diff under review

!`git diff HEAD --stat 2>/dev/null | tail -30 || echo "no changes"`

## Task

Review: **$ARGUMENTS** (empty means the uncommitted working tree).

Delegate to the `reviewer` subagent. If the diff touches authentication,
authorization, user input handling, file paths, database queries, cryptography,
or adds a dependency, also delegate to `security-reviewer` and merge both sets of
findings.

Rules for this pass:

- Read the surrounding file for every hunk before judging it.
- Verify each finding against the real code path; drop what you cannot substantiate.
- Order findings most severe first, each as `file:line`, why it breaks, and the fix.
- This command is read-only. Report findings; do not fix them unless I ask.

Finish with a one-line verdict: would you merge this as is?
