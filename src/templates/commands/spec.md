---
description: Turn an intent record into a spec with testable acceptance criteria and explicit non-goals, before any design or code.
argument-hint: [intent-slug | issue-number | description]
allowed-tools: Read, Write, Grep, Glob, Bash(gh issue view:*), Bash(git log:*)
---

## Task

Write the spec for: **$ARGUMENTS**

This is the design gate. It runs in this session rather than a subagent, because
the work is applying known conventions — the `requirements` and
`architecture-decisions` skills carry them — not a separate delegation boundary.

1. Read `.claude/sdlc/intent/$ARGUMENTS.md` if it exists. If not, and `$ARGUMENTS`
   is an issue number, read the issue. If neither, work from the description and
   say that no intent record existed.
2. Read the code that owns this behaviour before writing a single criterion. A
   spec written without reading the code specifies a system that does not exist.
3. Write acceptance criteria that someone could turn into tests without asking a
   question. Cover the unhappy paths, not just the happy one.
4. State the non-goals. This is the line that stops scope creep in review.
5. If the work involves a choice that is expensive to reverse — a data model, an
   API shape, a new dependency — record it as an ADR alongside the spec.
6. Write the spec to `.claude/sdlc/specs/<slug>.md`.

Do not design the implementation here. *What must be true* belongs in the spec;
*how to build it* belongs in `/plan`.

## Output

Print the outcome sentence, the acceptance criteria count, the non-goals, and any
open question that needs a human. Then stop — I review the spec before `/plan`.
