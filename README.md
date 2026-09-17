# agentic-sdlc

**An end-to-end software development lifecycle for [Claude Code](https://claude.com/claude-code) — installed into any repository with one command.**

Issue triage, spec writing, planning, implementation, testing, code review, security review and release preflight, run by scoped agents with a human gate at every stage — plus hooks that block destructive actions before they execute.

```bash
npx agentic-sdlc init
```

---

## The problem this solves

Everyone ends up hand-rolling the same `.claude/` directory: a reviewer agent here, a `/plan` command there, a half-remembered permission rule. It works for one person, drifts across a team, and nobody can answer *why is this code like this* three months later.

`agentic-sdlc` installs a standard one: committed to the repo, versioned, upgradeable, and safe to re-run.

## Quick start

```bash
cd your-project
npx agentic-sdlc init
```

```
🤖 Agentic SDLC

Project:  acme-api
Stack:    NestJS / TypeScript
Tests:    npm test

Choose workflow:
❯ Backend      API/service work, migration-aware  (suggested)
  Full SDLC    triage -> spec -> plan -> implement -> test -> review -> ship
  Minimal      plan + review only
  Flutter      widget tests, dart analyze

  ✓ Installed triage agent
  ✓ Installed planner agent
  ...
  ✓ Created settings.json (+53 rules, -0)

Ready.

Try:

  /sdlc <issue>
```

Then open Claude Code in that repo and run `/plan`, or `/sdlc DP-534` for the full loop.

Nothing is global. Everything lands in `.claude/` in your repo, so committing it gives your whole team the same lifecycle.

## What gets installed

```
your-project/
└── .claude/
    ├── agents/                    # who does the work
    │   ├── triage.md
    │   ├── planner.md
    │   ├── developer.md
    │   ├── tester.md
    │   ├── reviewer.md
    │   ├── security-reviewer.md
    │   └── deployer.md
    ├── commands/                  # what you type
    │   ├── triage.md  spec.md  plan.md  implement.md
    │   └── test.md  review.md  ship.md  deploy.md  sdlc.md
    ├── skills/                    # conventions, loaded when relevant
    │   ├── requirements/          SKILL.md + reference.md
    │   ├── architecture-decisions/SKILL.md + adr-template.md + reference.md
    │   ├── test-conventions/      SKILL.md + patterns.md
    │   ├── code-review-rubric/    SKILL.md + checklist.md
    │   ├── commit-and-pr/         SKILL.md + pr-template.md
    │   └── release-checklist/     SKILL.md + runbook.md
    ├── hooks/
    │   ├── guard.mjs              # blocks unsafe actions before they run
    │   └── guard.config.json      # your rules — never overwritten
    ├── sdlc/workflow.md           # the loop, documented for your team
    ├── settings.json              # permissions + hook registration (merged, not replaced)
    └── .agentic-sdlc.json         # install manifest (how updates stay safe)
```

---

## How it works

### The loop

```
  /triage      /spec        /plan      /implement   /test     /review    /ship   /deploy
     |           |            |            |          |          |         |        |
  intent.md -> spec.md -> plan.md ->     diff  ->   tests -> findings -> PR -> release plan
     |           |            |            |          |          |         |        |
   triage     (session)    planner     developer   tester    reviewer   human   deployer
                                                             security
```

**Every stage commits an artifact the next stage reads.** Intent, spec, plan, diff and review findings together form an audit trail that survives the conversation they came from.

| Stage | Command | Writes | Gate |
|---|---|---|---|
| Triage | `/triage 534` | `.claude/sdlc/intent/<slug>.md` | You confirm severity and scope |
| Spec | `/spec <slug>` | `.claude/sdlc/specs/<slug>.md` | You approve criteria before design |
| Plan | `/plan <slug>` | `.claude/sdlc/plans/<slug>.md` | **You approve before any code** |
| Implement | `/implement <slug>` | source files | — |
| Test | `/test` | test files | — |
| Review | `/review` | nothing (read-only) | You see findings before shipping |
| Ship | `/ship "title"` | a PR | You approve the commit and body |
| Deploy | `/deploy staging` | release plan + rollback plan | **Stops before deploying** |

`/sdlc <issue>` runs the whole thing, stopping at each gate.

Not every change needs all eight stages. A typo goes straight to `/implement`. A change with more than one reasonable approach should not skip `/plan`.

### Why four different primitives

This is the distinction the tool is built on:

| Primitive | Used for | Because |
|---|---|---|
| **Hooks** | Rules that must be enforced | They are code. They run whether or not the model cooperates. |
| **Skills** | Knowledge that applies in context | Loaded when the work matches, so conventions are applied *while* the work happens, not found in review. |
| **Subagents** | Delegation boundaries | Separate context window, scoped toolset, verbose intermediate work stays out of your session. |
| **CLAUDE.md** | Always-on project guidance | Short. Everything else is one of the above. |

A convention you *hope* is followed goes in a skill. A rule that must *never* be broken goes in a hook.

### The agents

Seven scoped specialists, not one generalist. Each runs in its own context with only the tools its job needs.

| Agent | Model | Tools | Can write |
|---|---|---|---|
| `triage` | sonnet | Read, Write, Grep, Glob, Bash, WebFetch | intent records only |
| `planner` | opus | Read, Write, Grep, Glob, Bash, WebFetch | plan files only |
| `developer` | inherit | Read, Write, Edit, Grep, Glob, Bash, TodoWrite | source files |
| `tester` | sonnet | Read, Write, Edit, Grep, Glob, Bash | test files |
| `reviewer` | sonnet | Read, Grep, Glob, Bash | **nothing** |
| `security-reviewer` | opus | Read, Grep, Glob, Bash | **nothing** |
| `deployer` | inherit | Read, Write, Grep, Glob, Bash | release plans only |

**The reviewers hold no write tools on purpose.** A reviewer that can fix what it finds stops reporting and starts editing — and the findings vanish into a diff nobody reads.

Models are tiered: `opus` where reasoning is subtle (design, security), `sonnet` for routine passes, `inherit` where you should stay in control. Change any of them by editing the `model:` line in the agent file.

### The skills

Each is a short `SKILL.md` that Claude loads when the work matches its description, linking to reference files it pulls in only when needed.

| Skill | Triggers on | Carries |
|---|---|---|
| `requirements` | vague requests, acceptance criteria, "what does done mean" | Criteria formats, worked examples, requirement smells |
| `architecture-decisions` | library/data-model/API choices, "why is it built this way" | ADR template, trade-off forces checklist, common traps |
| `test-conventions` | writing or fixing tests | Patterns per layer, what to cover, how to report verification |
| `code-review-rubric` | reviewing a diff, triaging findings | Severity scale, review order, per-category checklist |
| `commit-and-pr` | commit messages, branches, PR descriptions | Conventions, PR template, a good and a bad example |
| `release-checklist` | releases, deploys, changelogs | Gates, expand/contract migrations, rollback runbook |

---

## The safety guard

A `PreToolUse` hook runs before **every** Bash, Write and Edit call. It exits 2 to block, with a reason Claude sees.

**Blocked outright:**

- Recursive deletes of `/`, `~`, `.`, `*`, or a shallow system path
- `git push --force`, direct pushes to `main`/`master`/`develop`, `git reset --hard`, `git clean -f`, `git filter-branch`
- Reading or writing `.env`, `*.pem`, keystores, `service-account*.json` — **including via `cat`**, which ordinary permission rules do not catch
- `curl … | sh`, `sudo`, `chmod 777`, fork bombs, `mkfs`, `dd` to a block device
- `npm publish`, `terraform destroy`, `kubectl delete`, `aws s3 rb`, `redis-cli flushall`
- `DROP TABLE`, `TRUNCATE`, `DELETE FROM` without a `WHERE`
- **Edits to the guard itself** — a session cannot disable its own brakes

**Deliberately allowed**, because a guard that cries wolf gets switched off:

`rm -rf node_modules` · `rm -rf ./dist` · `git push origin feat/x` · `git push --force-with-lease` on a feature branch · `DELETE FROM … WHERE …` · `chmod 644` · anything on your own source files

Both halves are tested: 30 dangerous commands must block, 16 ordinary ones must not.

### Tuning it

Everything lives in `.claude/hooks/guard.config.json`, which **`agentic-sdlc update` never overwrites**.

```jsonc
{
  "mode": "block",              // "block" | "warn" (log only) | "off"
  "blockSudo": true,
  "protectedBranches": ["main", "master", "develop", "release/*"],
  "secretPaths": ["**/.env", "**/*.pem", "secrets/**"],
  "paths": {
    "severity": "ask",          // protected paths prompt instead of blocking
    "protected": ["**/migrations/**", ".github/workflows/**"]
  },
  "bash": {
    "allow": ["^npm run deploy:staging$"],   // escape hatch, regex
    "deny": [{ "pattern": "\\bmy-risky-cli\\b", "reason": "use the runbook" }]
  }
}
```

Verify it after any change:

```bash
agentic-sdlc doctor    # fires a known-dangerous call at the guard and checks it blocks
```

---

## Setup

### Requirements

- **Node.js 18.17+** — the CLI and the guard hook both run on it
- **[Claude Code](https://claude.com/claude-code)** installed
- **git** — `/review` and `/ship` need it
- **[`gh`](https://cli.github.com/)** — optional; `/ship` and `/triage` use it for PRs and issues

### Install

Per-project, no global install needed:

```bash
npx agentic-sdlc init
```

Or globally, if you set up many repos:

```bash
npm install -g agentic-sdlc
agentic-sdlc init
```

### Commit it

```bash
git add .claude && git commit -m "chore: add agentic sdlc"
```

Committing is the point — it is how the lifecycle becomes the team's rather than yours.

Add `.claude/settings.local.json` to `.gitignore` if teammates want personal overrides.

### Packs

| Pack | For | Contents |
|---|---|---|
| `full` | Anything | All 7 agents, 9 commands, 6 skills |
| `backend` | APIs and services | Full loop + DB-aware deny rules, migration safety |
| `flutter` | Flutter / Dart apps | Widget-test conventions, `dart analyze` verification |
| `minimal` | Existing repos, light touch | `planner` + reviewers, `/plan` + `/review`, guard |

`init` suggests one from your stack. Override with `--pack`:

```bash
agentic-sdlc init --pack backend --yes
```

---

## CLI reference

```
agentic-sdlc <command> [options]

  init      Install the SDLC into this repository (safe to re-run)
  update    Upgrade the templates, keeping every file you edited
  doctor    Check the installation and live-test the safety guard
  list      Show what a pack contains and what has drifted

  -p, --pack <id>   full | minimal | backend | flutter   (default: detected)
  -C, --dir <path>  Target repository                    (default: cwd)
  -y, --yes         Skip prompts, take the suggested pack
  -f, --force       Overwrite files you edited           (keeps a .bak copy)
  -n, --dry-run     Show what would change, write nothing
      --prune       Remove files no longer in the pack
  -v, --verbose     List unchanged files too
      --json        Machine-readable output              (doctor)
```

### Updating safely

```bash
agentic-sdlc update --dry-run    # see what would change
agentic-sdlc update              # apply
```

The install manifest records a hash of every file as written. On update each file falls into one of three cases:

| Case | What happens |
|---|---|
| Untouched since we wrote it | Upgraded to the new template |
| **You edited it** | **Preserved.** Reported, never overwritten |
| Was never ours | Left alone entirely |

`--force` takes the new template anyway and saves your version as `<file>.bak`. `--prune` removes files that left the pack — but only if you never edited them.

`settings.json` is merged the same way: rules and hooks you added by hand survive, and rules we shipped in an earlier version but no longer ship are withdrawn. Running `init` three times produces exactly the same file as running it once.

### `doctor`

```
  ✓ Claude Code CLI
  ✓ .claude directory
  ✓ Installed pack: backend  v0.1.0
  ✓ Pack files (33)  all present
  ✓ settings.json  valid
  ✓ Guard hooks registered  PreToolUse
  ✓ Safety guard live-tested  blocks `rm -rf /` and writes to .env
  ✓ Git repository
  ⚠ Git remote  no origin — /ship cannot open a PR
  ✓ GitHub CLI
```

Exits non-zero on failures, so it works in CI. `--json` for machine output.

---

## Do's and don'ts

### Do

- **Commit `.claude/`.** The lifecycle is only worth having if the whole team runs the same one.
- **Read the plan before approving it.** The gate is the product. Approving plans unread converts this into an expensive way to generate code you have not reviewed.
- **Let verification actually run.** When an agent reports a change as done, it pastes the real command output. If output is missing, the work is unverified — ask for it.
- **Edit the templates.** They are starting points. Your `planner.md` should end up knowing things about your codebase that ours cannot. Updates preserve your edits.
- **Tune `guard.config.json` early.** A false positive on day one is how a safety system gets disabled in week two. Add an `allow` regex instead of switching it off.
- **Start with `minimal` on a large existing repo**, then grow into `full` once the loop fits how you work.
- **Re-run `init` freely.** It is idempotent by design.
- **Run `doctor` in CI** to catch a `.claude/` that drifted or a guard someone disabled.

### Don't

- **Don't run the loop unattended.** Every gate exists because a wrong turn at that point is expensive. `/sdlc` stops at each one on purpose.
- **Don't give the reviewers write tools.** The moment a reviewer can fix things, it stops telling you what is wrong.
- **Don't let an agent "fix" a failing test by weakening it.** The skills forbid it; if you see an assertion softened or a timeout raised to reach green, reject the change.
- **Don't skip `/plan` for anything with two reasonable approaches.** That is precisely where an unplanned agent burns an afternoon in the wrong direction.
- **Don't put secrets in `.claude/`.** It is committed. Secrets go in `.env`, which the guard keeps out of the transcript.
- **Don't edit `.claude/settings.json` hooks by hand** and expect updates to keep them tidy — put your own rules in `guard.config.json`, which is yours.
- **Don't set `"mode": "off"`** to get past one blocked command. Add a narrow rule instead; a disabled guard protects nothing.
- **Don't treat generated artifacts as disposable.** The intent → spec → plan chain is the answer to "why is this like this" long after the session is gone.

---

## Customizing

Everything installed is plain markdown and JSON. Edit it.

| Want to | Do this |
|---|---|
| Change an agent's model | Edit `model:` in `.claude/agents/<name>.md` |
| Restrict an agent further | Edit `tools:` — it is an allowlist |
| Add a project convention | Add it to the relevant `SKILL.md`, or add a new skill directory |
| Add a command | Drop a markdown file in `.claude/commands/` |
| Change what is blocked | `.claude/hooks/guard.config.json` |
| Fix a wrong test command | Fix your package scripts, then `agentic-sdlc update --force` |

Your edits survive `update`. The only thing that overwrites them is `--force`, and that keeps a `.bak`.

## Troubleshooting

**Commands do not appear in Claude Code.** They are read at session start — restart Claude Code after `init`. Check `.claude/commands/*.md` exists and each file opens with `---` on line one.

**The guard blocks something legitimate.** Add a regex to `bash.allow` in `guard.config.json`. Confirm with `agentic-sdlc doctor`. Do not set `mode: off`.

**`settings.json is not valid JSON`.** The tool refuses to touch a settings file it cannot parse, so nothing was written. Fix the JSON — a trailing comma or a `//` comment is the usual cause — and re-run.

**An update did not change a file.** You edited it, so it was preserved. `agentic-sdlc list` shows what drifted; `update --force` takes the new template and keeps yours as `.bak`.

**Agents run the wrong test command.** Detection read your `package.json` scripts at install time. Fix the scripts, then `agentic-sdlc update --force`.

## Behind the scenes

### Package shape

**Zero runtime dependencies.** TypeScript compiled to ESM; the interactive picker, the colours and the argument parser are all a few dozen lines of `node:readline` and ANSI codes. `npx agentic-sdlc` downloads one small package and starts immediately — which matters for a tool whose whole promise is *one command*.

```
src/
├── cli.ts                  argument parsing, help, dispatch
├── commands/               init · update · doctor · list · report
├── core/
│   ├── detect.ts           stack detection -> real project commands
│   ├── packs.ts            pack definitions + permission contributions
│   ├── render.ts           {{var}} and {{#if}} substitution
│   ├── install.ts          the three-way file decision
│   ├── settings.ts         ownership-tracking settings merge
│   ├── manifest.ts         .claude/.agentic-sdlc.json
│   └── apply.ts            the pipeline that ties them together
└── templates/              shipped verbatim into .claude/
```

The build copies `src/templates/` to `dist/templates/` — templates are data, not code, so nothing compiles them.

### The install pipeline

```
detect(root)  →  pick pack  →  render templates  →  install files  →  merge settings  →  write manifest
     │                              │                     │                 │
package.json              project's real commands   hash comparison    ownership diff
pubspec.yaml              baked into every agent    per file           preserves yours
go.mod / pyproject
```

**Detection** reads `package.json`, `pubspec.yaml`, `go.mod`, `pyproject.toml` or `Cargo.toml`, identifies the framework from dependencies, picks the package manager from the lockfile, and extracts the real scripts. That is why your `planner.md` says `` `npm run lint` `` and not a generic placeholder — and why a project with no linter gets no lint instruction at all, rather than an invented `npx eslint .` that fails on first use.

**Rendering** is a deliberately tiny substitution pass: `{{test}}` for values, and `{{#if lint}}…{{/if}}` to drop a whole section when a project has no such command. No template engine, no dependency.

### The three-way file decision

This is the core of `init` being safe to re-run. The manifest stores a SHA-256 of every file **as we wrote it**. On any subsequent run, three hashes are compared: what we want to write, what the manifest says we last wrote, and what is on disk now.

| On disk | vs manifest | Decision |
|---|---|---|
| absent | — | **create** |
| identical to new template | — | **unchanged** (no write, no churn) |
| differs from template | matches manifest | **update** — it is ours and untouched |
| differs from template | differs from manifest | **preserve** — you edited it |
| differs from template | no manifest entry | **leave alone** — was never ours |

`--force` collapses the last two into *overwrite*, always writing a `.bak` first. Line endings are normalised before hashing, so a CRLF checkout does not read as a local edit.

### Settings merge with ownership

`settings.json` is the one file we cannot simply own — it is yours, and Claude Code reads it for far more than this tool. So the manifest records exactly which permission rules and hook handlers *we* contributed.

On update:

1. Rules we contributed before and no longer ship → **withdrawn**
2. Rules we ship now and are missing → **added**
3. Everything else — your rules, your hooks, your `model`, your `env` — **untouched**

That is what makes `init` idempotent: three runs produce a byte-identical file, with no duplicated permission entries and no duplicated hook handlers. A `settings.json` that fails to parse is never written to at all; the tool reports it and exits non-zero.

### The hook protocol

Claude Code runs the guard before the tool call, passing the pending call as JSON on stdin:

```json
{
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": { "command": "rm -rf /tmp/build" }
}
```

The guard replies through its exit code and stdout:

| Exit | stdout | Effect |
|---|---|---|
| `0` | *(nothing)* | No opinion — normal permission flow continues |
| `0` | `permissionDecision: "ask"` | You are prompted |
| `2` | `permissionDecision: "deny"` | **Blocked.** Claude is told the reason |

Exit 2 blocks unconditionally, so the guard prints the structured reason *and* exits 2 — the decision cannot be argued with, and the model still learns why.

### How the guard reads a shell command

Regexes alone are the wrong tool for `rm`. `rm -rf node_modules` and `rm -rf /` differ only in the argument, and flags can be written `-rf`, `-fr`, `-r -f`, or `--recursive`. So the guard does both:

1. **Whole-line pattern rules** run first — `curl … | sh`, `DROP TABLE`, fork bombs. These need the complete line.
2. **Structural analysis** runs per command: the line is split on `;`, `&&`, `||` and `|` (respecting quotes), each segment is tokenized, wrappers like `sudo` and `env VAR=x` are stripped, and then `rm`, `git` and the secret-readers (`cat`, `head`, `strings`, …) are analysed by flags and targets rather than by string matching.

Order matters, and getting it wrong is silent: an early version split on `|` *before* running the pattern rules, so `curl … | sh` became two harmless-looking segments and sailed through. The test suite exists because a security control that is not tested for both false negatives *and* false positives is a security control nobody can trust.

**The guard protects itself.** Edits to `guard.mjs`, `guard.config.json` and `settings.json` are denied, so a session that finds itself blocked cannot route around the block by rewriting the rules.

### Why `doctor` live-tests

Checking that a hook file exists proves nothing — a hook can be present, registered, and broken. `doctor` spawns the installed guard with a real `rm -rf /` payload and a real write-to-`.env` payload, and asserts it exits 2. It verifies the actual behaviour, in your repo, with your config.

## Development

```bash
npm install
npm run build
npm test          # cohesion + installer + guard suites
```

The cohesion suite enforces that the pieces refer to each other: every agent a command delegates to ships in the same pack, every reference file a skill links to travels with it, every template variable is one the renderer provides, and every stage agrees on where its artifact lives. Add an agent or command without wiring it up and the suite fails.

## License

MIT
