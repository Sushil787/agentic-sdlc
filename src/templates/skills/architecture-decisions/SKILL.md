---
name: architecture-decisions
description: Chooses between technical approaches and records the decision as an ADR. Use when picking a library, data model, API shape, or pattern; when a change is hard to reverse; or when asked why the system is built the way it is.
allowed-tools: Read, Grep, Glob, Bash(git log:*), WebFetch
---

# Architecture decisions

Record a decision when it is **expensive to reverse** or when the next person
will wonder why. Not every choice needs an ADR; a choice you would defend in a
review probably does.

## Method

1. **Read what exists first.** The strongest constraint on a decision is the code
   already here. Find the patterns this repository already commits to and say
   whether you are following or breaking them.
2. **Frame the forces, not the options.** What actually constrains this — latency
   budget, team familiarity, data volume, an existing contract, a deadline?
   Options only make sense against forces.
3. **Compare two or three real options.** Include "do nothing" when it is viable.
   For each: how it fails, not just how it works.
4. **Decide, and say why the runner-up lost.** A comparison without a decision is
   homework you handed back.
5. **Write the ADR** to `docs/adr/NNNN-<slug>.md` (or `.claude/sdlc/adr/` if the
   repo has no docs directory). Template in [adr-template.md](adr-template.md);
   worked examples and the trade-off checklist in [reference.md](reference.md).

## Rules

- Never present a menu of options without a recommendation.
- Name the reversibility cost explicitly: a one-way door gets more scrutiny than
  a decision you can undo in an afternoon.
- A new dependency is a decision. Who maintains it, what happens if it stops
  being maintained, and what does it cost to remove.
- Do not cite a benchmark you have not run or read. Say "unmeasured" instead.
- Superseding an old ADR means writing a new one that links to it, not editing
  history.
