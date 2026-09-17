---
description: Write and run tests that would fail without the change under test, then report the real result.
argument-hint: [file, behaviour, or bug to cover]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

## Current changes

!`git diff HEAD --stat 2>/dev/null | tail -20 || echo "no diff"`

## Task

Cover with tests: **$ARGUMENTS**

If `$ARGUMENTS` is empty, target the behaviour changed in the diff above.

Delegate to the `tester` subagent.

1. Read the existing tests for this area first and match their idiom.
2. For a bug fix, confirm the new test fails against the unfixed code, then passes.
3. Run `{{test}}` and report the pass/fail counts verbatim.

If anything fails, show the output and say it fails. Do not weaken an assertion
to get to green.
