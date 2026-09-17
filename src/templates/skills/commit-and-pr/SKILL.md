---
name: commit-and-pr
description: Branch, commit and pull request conventions for this repository. Use when writing a commit message, naming a branch, opening a pull request, or writing a PR description.
allowed-tools: Read, Bash(git log:*), Bash(git diff:*), Bash(git status:*)
---

# Commit and PR conventions

## This repository's actual history — match it

!`git log --oneline -15 2>/dev/null || echo "no history yet"`

If a convention is visible above, follow it over anything below. If the history
is empty or inconsistent, use the defaults here.

## Branches

`<type>/<ticket>-<short-description>` — `fix/DP-534-token-refresh`

Types: `feat` `fix` `chore` `refactor` `test` `docs` `perf` `security`

Never commit directly to `main`, `master`, or `develop`.

## Commits

```
<type>(<scope>): <imperative summary, <= 72 chars>

<why this change — the diff already shows what>

Refs: <ticket>
```

- One logical change per commit. If the summary needs "and", split it.
- Stage the files you changed. Never `git add -A` without reading `git status`.
- Read the diff for secrets before staging. A committed credential is compromised
  even after a force-push removes it — it must be rotated.
- Never amend or force-push a commit already pushed to a shared branch.

## Pull requests

Template and worked examples: [pr-template.md](pr-template.md).

The body describes what the diff actually does, drawn from reading it — not what
the plan intended. The two diverge more often than anyone expects.

Required: what changed, why, how it was verified **with the real command output**,
and what a reviewer should look at closely.

- If verification did not run, write that. Do not imply a green build you did not see.
- Call out migrations, config changes and anything not backwards compatible.
- Over ~400 lines of diff: explain why it could not be split.

## Attribution

Follow whatever the repository already does for co-authorship and trailers. Do not
add attribution lines the project does not use.
