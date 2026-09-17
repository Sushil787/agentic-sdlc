# Architecture trade-off reference

## The forces checklist

Run a decision past these before comparing options. The one or two that actually
bind are the decision; the rest are noise.

- **Reversibility** — one-way door or an afternoon's work to undo?
- **Blast radius** — how many services, teams, or clients does this reach?
- **Data gravity** — does it change the shape or ownership of stored data?
  Migrations are the expensive part of most decisions.
- **Latency and volume** — the real numbers, not the imagined ones.
- **Operational load** — who gets paged, and for what, once this ships?
- **Team familiarity** — a technically better tool nobody knows is often worse.
- **Dependency risk** — maintainer count, release cadence, licence, removal cost.
- **Testability** — can this be tested without live infrastructure?

## Worked example

**Decision:** how to handle webhook retries from a payment provider.

| | Option A: in-process retry | Option B: durable queue | Option C: provider retries |
|---|---|---|---|
| Works when | transient network blips | any failure, incl. deploys | provider supports it |
| Fails when | process restarts mid-retry | queue backs up unnoticed | provider gives up after N |
| Ops cost | none | a queue to monitor and drain | none |
| Reversibility | trivial | costly — consumers depend on it | trivial |
| Data risk | lost events on crash | at-least-once, needs idempotency | duplicate deliveries |

**Decided:** C, with idempotency keys, plus a dead-letter log.
**Why:** the binding force was operational load — the team is three people with
no queue on call. The provider already retries for 24 hours with backoff, which
covers every failure mode we have actually seen. B is the right answer at ten
times the volume; the ADR says to revisit at 50 events/second sustained.

## Common traps

| Trap | What it looks like | What to do |
|---|---|---|
| Resume-driven design | The new thing, for a problem the old thing solves | Name the force that the current stack fails |
| Premature distribution | A service split before a module boundary is stable | Draw the boundary in code first |
| Benchmark by vibes | "X is faster" with no measurement | Measure or write "unmeasured" |
| Reversibility blindness | Treating a schema change like a config change | Put reversibility in the table |
| Dependency by default | `npm install` as a first move | Cost the removal before the install |

## When *not* to write an ADR

Naming, formatting, a library everyone already uses for the thing it is for, or
anything you would undo in an hour. Write the code instead.
