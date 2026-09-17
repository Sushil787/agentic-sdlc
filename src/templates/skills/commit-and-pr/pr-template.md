# Pull request template and examples

## Template

```markdown
## What changed
- <user-visible outcome, 2-4 bullets, drawn from reading the diff>

## Why
<the problem this solves. Link the issue or spec.>

## How it was verified
```
$ {{test}}
<paste the real output>
```
<anything checked by hand, and anything not checked>

## Risk and rollout
- Migrations: <none | describe, and whether backwards compatible>
- Config: <new env vars, and whether they exist in each environment>
- Rollback: <how to undo this, and what undo will not recover>

## Reviewer notes
<the riskiest part of the diff, and the assumption most worth challenging>
```

## A good one

```markdown
## What changed
- Part numbers containing hyphens ("BRK-2201-A") now match in search.
- Empty results name the query instead of showing a blank panel.

## Why
34 support tickets in 30 days, all the same shape: the tokenizer split on
hyphens and required every token to match, so exact part numbers found nothing.
Closes #812.

## How it was verified
```
$ npm test
Tests: 214 passed, 214 total
```
Added `search/tokenizer.spec.ts` — it fails on the previous tokenizer.
Checked by hand against the 12 part numbers from the ticket thread.

## Risk and rollout
- Migrations: none.
- Config: none.
- Rollback: revert the commit; the index is unchanged, so no reindex is needed.

## Reviewer notes
`normalizeToken` now lowercases before stripping separators. If any caller
depended on case-sensitive tokens, this changes their results — I found none.
```

## A bad one, and why

```markdown
## What changed
Fixed search bug.

## How it was verified
Tests pass.
```

No reviewer can tell what to look at, whether the fix is complete, or whether
"tests pass" was observed or assumed. The first line of a PR body is the only
part some reviewers read; spend it on the outcome, not the label.
