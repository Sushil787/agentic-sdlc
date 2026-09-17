---
name: release-checklist
description: The gates that must pass before this project is released or deployed, and what a rollback plan must contain. Use when preparing a release, cutting a version, deploying to any environment, or writing release notes.
allowed-tools: Read, Grep, Glob, Bash
---

# Release checklist

## State

- Branch: !`git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown"`
- Last tag: !`git describe --tags --abbrev=0 2>/dev/null || echo "none"`

## Gates — in order, all of them

1. **Clean tree**, and the release names a specific commit SHA.
2. **CI green for that SHA** — confirmed by looking, not assumed from a green
   branch yesterday.
3. **Local verification reproduces**, with output pasted:
{{#if typecheck}}
   - `{{typecheck}}`
{{/if}}
{{#if lint}}
   - `{{lint}}`
{{/if}}
   - `{{test}}`
{{#if build}}
   - `{{build}}`
{{/if}}
4. **Every migration is backwards compatible** with the code currently running in
   the target environment. If one is not, it ships in its own earlier deploy.
   The expand/contract sequence is in [runbook.md](runbook.md).
5. **Config and secrets exist in the target environment.** Name the keys; never
   print values.
6. **A written rollback plan**, including what rollback cannot undo.
7. **Someone is watching.** Do not deploy into a window nobody is in.

## Rollback plan — required contents

- **Trigger:** the metric, error rate, or alarm that means roll back — decided
  before the deploy, not during the incident.
- **Steps:** the exact commands, in order.
- **What rollback will not undo:** migrations already applied, columns dropped,
  emails sent, webhooks delivered, packages published, payments captured.
- **Time to restore:** an honest estimate.

A release whose rollback plan says "revert the deploy" while the deploy dropped a
column does not have a rollback plan.

## Release notes

Written for the people affected, not generated from commit subjects. Group as
Added / Changed / Fixed / Security. Breaking changes go first, each with the
migration step a consumer must take.

## Never

- Deploy to production without explicit human approval that names production.
- Run a destructive infrastructure command as part of a routine deploy.
- Tag, publish or release as a side effect of another task.
- Report a gate as passed without the output that shows it passed.
