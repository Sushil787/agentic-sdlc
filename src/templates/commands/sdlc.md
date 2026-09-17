---
description: Run the full lifecycle for one work item — triage, plan, implement, test, review — pausing for approval at each gate.
argument-hint: [issue-number | description of the work]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, TodoWrite
---

## Task

Run the full SDLC loop for: **$ARGUMENTS**

This is the whole lifecycle with human gates. Use TodoWrite to track the phases.

### 1. Triage
Delegate to `triage`. Produce `.claude/sdlc/intent/<slug>.md`.
**Gate:** show the classification and root cause. Stop if severity or scope looks
wrong to me.

### 2. Spec
In this session, using the `requirements` skill, turn the intent into
`.claude/sdlc/specs/<slug>.md`: acceptance criteria and non-goals.
Skip this stage only for a change whose criteria fit in one line, and say so.
**Gate:** show the criteria and non-goals. Wait for my approval.

### 3. Plan
Delegate to `planner`. Produce `.claude/sdlc/plans/<slug>.md`.
**Gate:** show the goal, approach, and step count. Wait for my approval before
touching any source file.

### 4. Implement
Create a working branch if we are on a protected one. Delegate to `developer`.
Execute the plan step by step.

### 5. Test
Delegate to `tester`. Run `{{test}}` and report the real counts.

### 6. Review
Delegate to `reviewer`, plus `security-reviewer` if the diff touches auth, input
handling, queries, crypto, or dependencies. Fix critical and high findings, then
re-run step 5.

### 7. Hand back
Summarise: what changed, what was verified with actual output, what is left, and
the command to ship it (`/ship`).

## Rules

- Stop at every gate. Do not run the whole loop unattended.
- If any phase finds that the premise is wrong, stop and say so rather than
  continuing to the next phase.
- Never report a phase as passed without the output that shows it passed.
