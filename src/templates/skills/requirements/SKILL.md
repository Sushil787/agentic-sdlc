---
name: requirements
description: Turns a vague request into testable requirements with explicit acceptance criteria and non-goals. Use when a feature request, ticket, or user need arrives underspecified, when writing user stories or acceptance criteria, or when asked what "done" means for a piece of work.
allowed-tools: Read, Grep, Glob, Bash(gh issue view:*), Bash(git log:*)
---

# Requirements

A requirement is finished when someone could write the test from it without
asking you a question. Anything less is a wish.

## Method

1. **Find the real user and the real job.** Who hits this, how often, and what
   are they doing today instead? A feature with no answer to "instead of what?"
   is usually a solution looking for a problem.
2. **Separate the problem from the proposed solution.** Requests arrive as
   solutions ("add a retry button"). Recover the problem behind it ("uploads fail
   silently on flaky networks") — it often has a better answer.
3. **Write the acceptance criteria before the design.** Given/When/Then, one per
   behaviour, each independently checkable. See [reference.md](reference.md) for
   the formats and worked examples.
4. **State the non-goals.** What this deliberately does not do is the single most
   useful line in the document; it is what stops scope creep later.
5. **Name the unknowns.** Every assumption you had to make, and who can settle it.

## Output

```markdown
## Problem
<who, doing what, blocked by what — with evidence, not assumption>

## Outcome
<the one sentence that says what is true after this ships>

## Acceptance criteria
- [ ] Given <state>, when <action>, then <observable result>
- [ ] Given <error state>, when <action>, then <specific error behaviour>

## Non-goals
- <deliberately not doing this, and why>

## Open questions
- <question> -> <who decides>
```

## Rules

- No criterion that cannot fail. "Works well" is not a criterion; "responds in
  under 300 ms at p95" is.
- Cover the unhappy paths: empty, too large, unauthorized, offline, concurrent.
- If two people would read a requirement differently, rewrite it.
- If the request rests on a belief about the system that the code contradicts,
  say so before writing anything else.
- Do not invent metrics, user counts, or deadlines. If you need a number you do
  not have, mark it as an open question.
