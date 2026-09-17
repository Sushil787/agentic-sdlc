# Test patterns by layer

## Unit — one module, no I/O

Mock only what crosses a process boundary: network, filesystem, clock, randomness.
Do not mock your own pure functions; calling them is cheaper and more honest.

```
describe('<unit>', () => {
  it('<behaviour in plain words, not the method name>', () => {
    // arrange: the smallest state that makes the behaviour possible
    // act: one call
    // assert: the observable result
  })
})
```

Name tests for the behaviour, not the function: `rejects an expired token`, not
`test validateToken`.

## Integration — several modules, real boundaries

Use the real database, the real router, the real serializer. Fake only what you
do not own (third-party APIs) and what you cannot make deterministic.

- Reset state between tests with a transaction rollback or a truncate, not by
  hoping tests run in order.
- Test the seams: the wiring between layers is where integration bugs live.
  A test that exercises one layer through another is doing its job.

## End-to-end — few, and only for critical journeys

E2E tests are expensive and flaky by nature. Reserve them for journeys where
failure means lost money or lost data: sign-in, checkout, the core workflow.

Wait on application state (an element, a network response, a database row) —
never on a duration.

## Fixtures

- Build with a factory that takes overrides: `makeUser({ role: 'admin' })`.
  Inline literals drift; shared mutable fixtures couple tests together.
- Each test declares the state it depends on. A test that passes only after
  another test ran is a broken test.

## What to cover

For each behaviour, the cases that actually break:

| Case | Example |
|---|---|
| Empty | empty string, empty list, no rows |
| Boundary | 0, 1, max length, max int, last page |
| Malformed | wrong type, missing field, extra field |
| Unauthorized | wrong user, wrong role, expired credential |
| Concurrent | two writers, retry after partial failure |
| Downstream failure | dependency times out, returns 500, returns garbage |

You do not need all six for every function. You do need to have considered them.

## Coverage

Coverage percentage measures lines executed, not behaviour verified. A file at
100% can have no assertions worth the name. Use it to find untested files, never
as a target to hit.
