---
name: code-review-rubric
description: The severity scale and review priorities used when reviewing a diff in this repository. Use when reviewing code, triaging review findings, deciding whether a finding blocks a merge, or asking how serious a problem is.
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git log:*), Bash(gh pr:*)
---

# Code review rubric

A review's value is in what it catches, not in how much it says. Findings are
ranked by severity and each one must survive a verification pass before it is
reported. An unverified finding costs the author more time than it saves.

## Severity scale

| Severity | Means | Merge? |
|---|---|---|
| **critical** | Data loss, security hole, or an outage path reachable in production | Blocks |
| **high** | Wrong output for a realistic input, or a broken contract callers depend on | Blocks |
| **medium** | Correct today, fragile tomorrow: unhandled edge, missing test on changed behaviour | Author's call |
| **low** | Clarity, naming, dead code, a convention the linter does not enforce | Non-blocking |

Anything you cannot attach a concrete failing input to is not a finding. Drop it.

## Review order

Work down this list. Stop spending attention when the budget is gone — the top of
the list is where the defects that matter live.

1. **Correctness** — trace the changed path with a real input.
2. **Contract** — did a signature, response shape, schema, or event payload change
   without its consumers?
3. **Security** — see the `security` section of [checklist.md](checklist.md).
4. **Failure handling** — what happens when the dependency below this is down,
   slow, or returns something unexpected?
5. **Tests** — is there a test that goes red if this change is reverted?
6. **Conventions** — does it look like its neighbours?

Full per-category checklist: [checklist.md](checklist.md).

## Verification pass — before reporting anything

For each candidate finding, answer in your head:

- What exact input or state produces the bad outcome?
- Have I read the function it calls, or am I assuming its behaviour?
- Is it already handled somewhere I have not read — a guard clause, middleware,
  a validator, a database constraint?

If you cannot answer all three, it does not go in the review.

## Output

```
critical  src/auth/session.ts:88 — expired tokens pass the freshness check
  Fails when: token issued >24h ago; `exp` compared in seconds against ms epoch,
              so every expired token reads as valid.
  Fix: multiply by 1000, or compare with `Date.now() / 1000`.
```

Then one line of verdict: would you merge this as is?

## Rules

- Never report style the linter already owns. Fix the linter instead.
- Never restate what the diff does.
- "No findings" is a complete review. Say what you checked so the next reviewer
  knows the ground covered.
- Review the code, not the author. No praise padding, no scolding.
