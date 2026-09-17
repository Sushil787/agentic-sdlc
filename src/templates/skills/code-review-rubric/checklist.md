# Review checklist by category

Use as a prompt list, not a form to fill in. Most diffs touch three or four rows.

## Correctness

- Off-by-one in slices, ranges, pagination, retries.
- Comparison against the wrong unit (seconds vs milliseconds, bytes vs KB).
- Swapped arguments of the same type — `fn(userId, orgId)` called as `fn(orgId, userId)`.
- `null` / `undefined` / empty-array paths the happy path never exercises.
- Floating point used for money.
- Timezone assumed to be the server's.
- Mutation of a shared object, default parameter, or module-level cache.
- `async` function whose rejection nobody awaits.
- Early `return` inside a loop that was meant to be `continue`.

## Contracts

- Response field renamed, removed, or made optional without a consumer sweep.
- Status code or error shape changed.
- Database column dropped or narrowed in the same deploy as the code that needs it.
- Event or queue message shape changed without a version.
- A public type that a downstream package imports.
- Default value changed — silent behaviour change for every existing caller.

## Security

- Input crossing a trust boundary without validation.
- Query or command built by string concatenation.
- Authorization checked on the *session* but not on the *object* being touched (IDOR).
- A role or permission field the client can influence.
- Secret in code, log, error body, or client bundle.
- `Math.random()` for anything security-relevant.
- Path from user input reaching the filesystem without normalisation.
- New dependency: who maintains it, and what access does it get?

## Failure handling

- Network call with no timeout.
- Retry with no backoff, or retrying a non-idempotent operation.
- `catch` that swallows the error and continues.
- Error message that leaks internals to the user, or tells them nothing.
- Partial write with no rollback or compensating action.
- Unbounded queue, cache, or in-memory collection.

## Concurrency

- Read-modify-write without a lock, transaction, or atomic operation.
- Assumption that two requests will not interleave.
- Shared state in a handler that runs concurrently.
- Migration that is not safe to run while the old code is still serving traffic.

## Performance — only when it is on a hot path

- Query inside a loop (N+1).
- Missing index for a new query pattern.
- Loading a whole table or file to use one row.
- Work in a request that belongs in a job.

Do not raise performance findings on cold paths. "This could be faster" is not a
review finding; "this runs per row on a 2M-row table" is.

## Tests

- A behaviour change with no test that would go red on revert.
- A test changed in the same commit as the code it covers — read why.
- Assertion weakened, `skip` added, or a timeout raised to reach green.
- New test that would pass against the unfixed code.
