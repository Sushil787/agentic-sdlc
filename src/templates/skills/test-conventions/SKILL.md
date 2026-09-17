---
name: test-conventions
description: How tests are written, run and judged in this repository. Use when writing a new test, fixing a failing or flaky test, deciding what to assert, or reporting whether a change is verified.
allowed-tools: Read, Grep, Glob, Bash
---

# Test conventions

Run the suite with `{{test}}`.
{{#if typecheck}}
Type check with `{{typecheck}}`.
{{/if}}

## The one rule

**A test earns its place only if it fails when the behaviour breaks.**

Before you finish a test, revert the change under test in your head: does it go
red? If not, you have written a test that asserts the code was called, not that
it works. Delete it and start from the behaviour.

For a bug fix this is literal, not a thought experiment: write the test, watch it
fail against the unfixed code, then fix. That failure is the only evidence the
test covers the bug.

## Before writing

Read two or three existing tests for the same layer and match them: location,
naming, fixture and mock style, assertion library. A second idiom costs more than
the coverage it adds.

Patterns by layer, and how much to mock at each: [patterns.md](patterns.md).

## Verification reporting

When you report a change as verified, paste what the command actually printed —
the command, the pass/fail counts, and any failure output. "Tests pass" without
the output is not a verification, and a change reported as done on the strength of
it is a change nobody has checked.

If the suite fails, say it fails. If you did not run it, say you did not run it.

## Determinism

- Control time, randomness and the network. No live network calls in unit tests.
- Never sleep to synchronise; wait on the condition.
- A flaky test is a bug report about the code or the test. Explain the race. Do
  not retry it into passing, and do not delete it to unblock a merge.

## Never

- Weaken an assertion, raise a timeout, or add `skip` to reach green.
- Mock the thing under test.
- Assert on incidental strings a copy edit would break.
- Write a test whose only assertion is that a mock was called.
