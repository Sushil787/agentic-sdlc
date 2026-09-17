---
description: Run the pre-flight checks, then open a pull request with a description drawn from the actual diff.
argument-hint: [PR title]
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash
---

## Pre-flight

- Branch: !`git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "not a git repo"`
- Working tree: !`git status --short 2>/dev/null || echo "clean"`
- Commits ahead of main: !`git log --oneline main..HEAD 2>/dev/null | head -20 || echo "unknown"`

## Task

Ship: **$ARGUMENTS**

Work through this in order and stop at the first failure:

1. Refuse to continue if the current branch is `main`, `master`, or `develop`.
2. Run the verification commands and require them to pass:
{{#if typecheck}}
   - `{{typecheck}}`
{{/if}}
{{#if lint}}
   - `{{lint}}`
{{/if}}
   - `{{test}}`
3. Run a `/review` pass over `main...HEAD` and resolve anything critical or high.
4. Confirm no secret, credential, `.env` value, or debug logging is in the diff.
5. Show me the commit message and the PR body, and wait for my go-ahead.
6. On approval: commit, push the branch, and open the PR with `gh pr create`.

The PR body must describe what actually changed, drawn from the diff — not from
the plan's intentions. Include: what changed and why, how it was verified with the
real command output, and anything a reviewer should look at closely.

Never force-push. Never push straight to a protected branch.
