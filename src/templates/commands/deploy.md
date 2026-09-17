---
description: Run deployment preflight and produce a release plan with a rollback plan. Does not deploy without explicit approval.
argument-hint: [environment: staging | production]
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash
---

## Release state

- Branch: !`git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "not a git repo"`
- Commit: !`git rev-parse --short HEAD 2>/dev/null || echo "unknown"`
- Working tree: !`git status --short 2>/dev/null || echo "clean"`
- Last tag: !`git describe --tags --abbrev=0 2>/dev/null || echo "none"`
- Unreleased commits: !`git log --oneline $(git describe --tags --abbrev=0 2>/dev/null)..HEAD 2>/dev/null | head -20 || git log --oneline -10 2>/dev/null`

## Task

Prepare a deployment to: **$ARGUMENTS**

If `$ARGUMENTS` is empty, assume `staging` and say so.

Delegate to the `deployer` subagent. It runs preflight and writes a release plan
to `.claude/sdlc/releases/<version>-<environment>.md`.

**This command stops after the plan.** Present:

1. Pass/fail for each preflight check, with real output for any failure.
2. What ships, in user-visible terms.
3. Any migration that is not backwards compatible, called out first.
4. The rollback plan, including what rollback cannot undo.

Then ask me to approve. Do not run a deploy command, tag a release, or publish a
package until I approve this specific environment in this session. For production,
I must say "production" myself — inferring it from context is not approval.
