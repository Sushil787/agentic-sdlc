# Agentic SDLC — {{projectName}}

Installed by `agentic-sdlc` v{{cliVersion}} · pack: **{{pack}}** · stack: {{framework}} / {{language}}

An end-to-end lifecycle for this repository, run by Claude Code agents with a
human gate at every stage. Committed, so the whole team gets the same loop.

## The loop

```
  /triage      /spec        /plan      /implement   /test     /review    /ship   /deploy
     |           |            |            |          |          |         |        |
  intent.md -> spec.md -> plan.md ->     diff  ->   tests -> findings -> PR -> release plan
     |           |            |            |          |          |         |        |
   triage     (session)    planner     developer   tester    reviewer   human   deployer
                                                             security
```

Each stage commits an artifact the next stage reads. Together the intent, the
spec, the plan, the diff and the review findings are the audit trail — you can
answer "why is this code like this?" months later without anyone's memory.

The loop is deliberately not autonomous. `/spec` and `/plan` stop for your
approval before any code is written, `/review` stops before shipping, and
`/deploy` stops before anything leaves your machine.

Run the whole thing for one item with `/sdlc <issue>`.

## Commands

| Command | Stage | Writes |
|---|---|---|
| `/triage <issue>` | Classify, reproduce, scope | `.claude/sdlc/intent/<slug>.md` |
| `/spec <slug>` | Acceptance criteria and non-goals | `.claude/sdlc/specs/<slug>.md` |
| `/plan <slug>` | Step-by-step approach, read-only | `.claude/sdlc/plans/<slug>.md` |
| `/implement <slug>` | Execute the plan | source files |
| `/test [target]` | Tests that fail without the change | test files |
| `/review [target]` | Correctness + security findings | nothing (read-only) |
| `/ship <title>` | Preflight, then opens a PR | a PR |
| `/deploy <env>` | Preflight, then a release plan | `.claude/sdlc/releases/*.md` |
| `/sdlc <issue>` | The full loop, with gates | all of the above |

Not every change needs all eight. A typo fix goes straight to `/implement`. A
change with more than one reasonable approach should not skip `/plan`.

## Agents

Seven scoped specialists — a focused roster beats one do-everything agent, and
each runs in its own context so verbose intermediate work never reaches yours.

| Agent | Model | Can write |
|---|---|---|
| `triage` | sonnet | intent records only |
| `planner` | opus | plan files only |
| `developer` | inherit | source files |
| `tester` | sonnet | test files |
| `reviewer` | sonnet | nothing — read-only |
| `security-reviewer` | opus | nothing — read-only |
| `deployer` | inherit | release plans only |

Your pack (**{{pack}}**) installs a subset of these. Run `agentic-sdlc list` to
see exactly what is in this repository.

The reviewers hold no write tools on purpose: a reviewer that can fix what it
finds stops reporting and starts editing, and the findings disappear.

## Skills

Loaded automatically when the work matches their description, each with reference
files pulled in only when needed:

| Skill | Carries |
|---|---|
| `requirements` | Acceptance criteria formats, worked examples, requirement smells |
| `architecture-decisions` | ADR template, trade-off forces checklist, common traps |
| `test-conventions` | Patterns per layer, what to cover, verification reporting |
| `code-review-rubric` | Severity scale, review order, per-category checklist |
| `commit-and-pr` | Branch/commit format, PR template, worked examples |
| `release-checklist` | Release gates, expand/contract migrations, rollback runbook |

## Why each thing is what it is

- **Hooks** for rules that must be enforced — they are code, and they run whether
  or not the model cooperates.
- **Skills** for knowledge that applies in context — loaded when relevant, so the
  conventions are applied while the work happens rather than found in review.
- **Subagents** for delegation boundaries — a separate context and a scoped
  toolset per job.
- **CLAUDE.md** for always-on project guidance. Keep it short.

## Project commands

Detected at install time and baked into the agent instructions:

- Install: `{{install}}`
- Test: `{{test}}`
{{#if lint}}
- Lint: `{{lint}}`
{{/if}}
{{#if typecheck}}
- Typecheck: `{{typecheck}}`
{{/if}}
{{#if build}}
- Build: `{{build}}`
{{/if}}

If these are wrong, fix your package scripts and run `agentic-sdlc update --force`.

## Safety

`.claude/hooks/guard.mjs` runs before every Bash, Write and Edit call and blocks:

- recursive deletes of `/`, `~`, `.`, or a shallow system path
- force pushes, `git reset --hard`, `git clean -f`, direct pushes to a protected branch
- reading or writing `.env`, keys, keystores and service-account files — including
  via `cat`, which ordinary permission rules do not catch
- `curl | sh`, `chmod 777`, `sudo`, fork bombs, `mkfs`, `dd` to a device
- package publishing, `terraform destroy`, `kubectl delete`, bucket deletion,
  `redis-cli flushall`, `DROP TABLE`, `DELETE FROM` without a `WHERE`
- edits to the guard itself, so a session cannot disable its own brakes

Tune the rules in `.claude/hooks/guard.config.json` — yours, never overwritten by
an update. `"mode": "warn"` logs instead of blocking; `"off"` disables it.

## Maintenance

```bash
agentic-sdlc doctor    # check the install; live-tests the guard
agentic-sdlc update    # upgrade templates, keep local edits
agentic-sdlc list      # what is installed and what has drifted
```

Files you edit are never overwritten by `update`. Use `update --force` to take the
new template anyway; your version is kept as `<file>.bak`.
