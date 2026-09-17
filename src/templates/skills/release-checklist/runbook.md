# Deploy runbook patterns

## Expand / contract — shipping a schema change safely

A migration and the code that needs it must not deploy together if the old code
is still serving traffic during the rollout. Split into three deploys:

1. **Expand.** Add the new column/table/field, nullable or with a default.
   Old code ignores it. Safe to roll back — nothing reads it yet.
2. **Migrate and dual-write.** New code writes both old and new; backfill existing
   rows in batches. Reads still come from the old field. Still safe to roll back.
3. **Contract.** Switch reads to the new field, stop writing the old one, then —
   in a later deploy, after a soak period — drop the old column.

The drop is the only irreversible step, and it happens last, alone, when the new
path has been running long enough to trust.

**Never in one deploy:** rename a column, narrow a type, add a NOT NULL without a
default, or drop anything the currently-running code still reads.

## Long-running migrations

- Batch them. A single `UPDATE` across millions of rows locks the table and takes
  the site down.
- Make them resumable and idempotent — they will be interrupted.
- Run them outside the deploy, with their own monitoring, not in a startup hook.

## Feature flags

Prefer a flag over a branch for anything risky. Deploy dark, enable for yourself,
then a percentage, then everyone. Rollback becomes a config change, which is
seconds rather than a deploy cycle.

Remove the flag once the feature is permanent. A codebase of stale flags is a
second, undocumented configuration language.

## Post-deploy verification

Decide these before deploying, not after:

- The health check to hit, and the response that means healthy.
- The one metric that would show this specific change failing — error rate on the
  changed endpoint, queue depth, p95 latency — and its normal range.
- How long to watch before calling it good.

## Incident quick path

1. Stop the bleeding — roll back or disable the flag. Diagnose afterwards.
2. Say what you did in the channel, as you do it.
3. Preserve evidence: logs, the failing request, the metric graph.
4. Write the timeline while it is fresh.
5. The fix that prevents recurrence is a follow-up item, not part of the rollback.

## Never

- Deploy on the way out of the door.
- Deploy a change you have not read because CI was green.
- Skip staging because the change is small. Small changes cause most incidents —
  they are the ones nobody reviews carefully.
