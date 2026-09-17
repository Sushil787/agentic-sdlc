# Requirements reference

## Acceptance criteria formats

### Given/When/Then — default for behaviour

```
Given a signed-in user with an expired session token
When they submit the booking form
Then they are re-authenticated silently and the booking completes
And no form data is lost
```

One behaviour per criterion. If yours needs "and" in the *When*, it is two.

### Rule-based — better for policy and validation

```
- Passwords shorter than 12 characters are rejected with FIELD_TOO_SHORT.
- A rejected password never reaches the audit log.
- Three failures within 60 seconds lock the account for 15 minutes.
```

### Table — better for matrices

| Role | Own record | Others' records |
|---|---|---|
| owner | read, write, delete | read |
| member | read, write | none |
| guest | read | none |

## Worked example: turning a request into requirements

**Request as received:** "Users are complaining about the search, can we make it
better?"

**Wrong move:** plan a search rewrite.

**Right move — find the actual failure:**

```
## Problem
Support tickets (n=34, last 30 days) show one pattern: searching a full part
number like "BRK-2201-A" returns nothing, while "BRK 2201" works. The tokenizer
splits on hyphens and requires all tokens to match.

## Outcome
Searching the exact part number a user reads off the invoice finds the part.

## Acceptance criteria
- [ ] Given a part with number "BRK-2201-A", when a user searches "BRK-2201-A",
      then that part is the first result.
- [ ] Given the same part, when a user searches "brk2201a", then that part
      appears in the first page of results.
- [ ] Given a query matching nothing, when the search runs, then the empty state
      names the query and offers the nearest match.

## Non-goals
- No relevance ranking changes for multi-word queries.
- No new search infrastructure. This is a tokenizer fix.

## Open questions
- Should hyphen-insensitive matching apply to SKUs too? -> @catalog-team
```

## Smells

| Smell | Why it costs you | Fix |
|---|---|---|
| "Should be fast" | Nobody can test it | Name the number and the percentile |
| "Handle errors gracefully" | Every reviewer imagines something different | List the errors and the behaviour for each |
| "Like <competitor> does" | Assumes shared knowledge | Describe the behaviour itself |
| "And also…" in one criterion | Hides a second requirement | Split it |
| No non-goals section | Scope grows in review | Write the three things you are not doing |

## Sizing

If the acceptance criteria list runs past about seven items, the work is probably
two pieces. Split along the seam where one half could ship alone and still be
worth having.
