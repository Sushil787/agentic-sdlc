// The installer's contract: re-running it is safe, and it never destroys work.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apply } from '../dist/core/apply.js';

const VERSION = '9.9.9';

function project(files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'agentic-sdlc-'));
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ name: 'demo', scripts: { test: 'jest', lint: 'eslint .' } }),
  );
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

const run = (root, options = {}) =>
  apply({ root, packId: 'full', version: VERSION, force: false, dryRun: false, prune: false, ...options });

const statuses = (result) => result.install.results.map((r) => r.status);
const settingsOf = (root) => JSON.parse(readFileSync(join(root, '.claude/settings.json'), 'utf8'));

test('a fresh install creates every file in the pack', () => {
  const root = project();
  const result = run(root);
  assert.equal(statuses(result).every((s) => s === 'created'), true);
  for (const file of result.pack.files) {
    assert.ok(existsSync(join(root, '.claude', file)), `${file} was not written`);
  }
  rmSync(root, { recursive: true, force: true });
});

test('running init three times changes nothing after the first', () => {
  const root = project();
  run(root);
  const second = run(root);
  const third = run(root);

  assert.equal(statuses(second).every((s) => s === 'unchanged'), true, 'second run rewrote files');
  assert.equal(statuses(third).every((s) => s === 'unchanged'), true, 'third run rewrote files');

  const { permissions, hooks } = settingsOf(root);
  for (const bucket of ['allow', 'deny', 'ask']) {
    assert.equal(
      permissions[bucket].length,
      new Set(permissions[bucket]).size,
      `${bucket} rules were duplicated`,
    );
  }
  assert.equal(hooks.PreToolUse.length, 2);
  for (const entry of hooks.PreToolUse) assert.equal(entry.hooks.length, 1, 'hook handler duplicated');
  rmSync(root, { recursive: true, force: true });
});

test('a file the user edited is preserved, not overwritten', () => {
  const root = project();
  run(root);
  const target = join(root, '.claude/agents/planner.md');
  writeFileSync(target, '# my own planner\n');

  const result = run(root);
  const planner = result.install.results.find((r) => r.path === '.claude/agents/planner.md');

  assert.equal(planner.status, 'modified-kept');
  assert.equal(readFileSync(target, 'utf8'), '# my own planner\n');
  rmSync(root, { recursive: true, force: true });
});

test('--force overwrites an edited file but keeps a .bak of it', () => {
  const root = project();
  run(root);
  const target = join(root, '.claude/agents/planner.md');
  writeFileSync(target, '# my own planner\n');

  const result = run(root, { force: true });
  const planner = result.install.results.find((r) => r.path === '.claude/agents/planner.md');

  assert.equal(planner.status, 'overwritten');
  assert.notEqual(readFileSync(target, 'utf8'), '# my own planner\n');
  assert.equal(readFileSync(`${target}.bak`, 'utf8'), '# my own planner\n');
  rmSync(root, { recursive: true, force: true });
});

test('a pre-existing file we never wrote is left alone', () => {
  const root = project({ '.claude/agents/planner.md': '# theirs, from before\n' });
  const result = run(root);
  const planner = result.install.results.find((r) => r.path === '.claude/agents/planner.md');

  assert.equal(planner.status, 'foreign-kept');
  assert.equal(readFileSync(join(root, '.claude/agents/planner.md'), 'utf8'), '# theirs, from before\n');
  rmSync(root, { recursive: true, force: true });
});

test('a dry run reports what it would do and writes nothing', () => {
  const root = project();
  const result = run(root, { dryRun: true });
  assert.ok(result.install.results.length > 0);
  assert.equal(existsSync(join(root, '.claude/agents/planner.md')), false);
  assert.equal(existsSync(join(root, '.claude/settings.json')), false);
  rmSync(root, { recursive: true, force: true });
});

test('settings the user added by hand survive an install', () => {
  const root = project({
    '.claude/settings.json': JSON.stringify({
      model: 'claude-opus-5',
      permissions: { allow: ['Bash(make build:*)'], deny: ['Read(./private/**)'] },
      hooks: {
        PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'their-own-hook.sh' }] }],
      },
    }),
  });

  run(root);
  const settings = settingsOf(root);

  assert.equal(settings.model, 'claude-opus-5', 'an unrelated key was dropped');
  assert.ok(settings.permissions.allow.includes('Bash(make build:*)'));
  assert.ok(settings.permissions.deny.includes('Read(./private/**)'));
  const bash = settings.hooks.PreToolUse.find((e) => e.matcher === 'Bash');
  assert.ok(bash.hooks.some((h) => h.command === 'their-own-hook.sh'), 'their hook was removed');
  assert.ok(bash.hooks.some((h) => String(h.command).includes('guard.mjs')), 'our guard was not added');
  rmSync(root, { recursive: true, force: true });
});

test('a broken settings.json is reported, never rewritten', () => {
  const root = project({ '.claude/settings.json': '{ "permissions": ' });
  const result = run(root);

  assert.equal(result.settingsUnreadable, true);
  assert.equal(readFileSync(join(root, '.claude/settings.json'), 'utf8'), '{ "permissions": ');
  rmSync(root, { recursive: true, force: true });
});

test('switching to a smaller pack reports orphans, and --prune removes them', () => {
  const root = project();
  run(root);
  assert.ok(existsSync(join(root, '.claude/agents/deployer.md')));

  const kept = apply({ root, packId: 'minimal', version: VERSION, force: false, dryRun: false, prune: false });
  const orphans = kept.install.results.filter((r) => r.status === 'orphaned');
  assert.ok(orphans.some((r) => r.path === '.claude/agents/deployer.md'));
  assert.ok(existsSync(join(root, '.claude/agents/deployer.md')), 'orphan removed without --prune');

  const pruned = apply({ root, packId: 'minimal', version: VERSION, force: false, dryRun: false, prune: true });
  assert.ok(pruned.install.results.some((r) => r.status === 'pruned'));
  assert.equal(existsSync(join(root, '.claude/agents/deployer.md')), false);
  rmSync(root, { recursive: true, force: true });
});

test('--prune keeps an orphan the user edited', () => {
  const root = project();
  run(root);
  writeFileSync(join(root, '.claude/agents/deployer.md'), '# mine now\n');

  apply({ root, packId: 'minimal', version: VERSION, force: false, dryRun: false, prune: true });

  assert.equal(readFileSync(join(root, '.claude/agents/deployer.md'), 'utf8'), '# mine now\n');
  rmSync(root, { recursive: true, force: true });
});

test('templates render with the project\'s real commands', () => {
  const root = project();
  run(root);
  const workflow = readFileSync(join(root, '.claude/sdlc/workflow.md'), 'utf8');

  assert.ok(workflow.includes('jest'), 'detected test command missing from the docs');
  assert.ok(workflow.includes('eslint .'), 'detected lint command missing from the docs');
  assert.equal(/\{\{\w+\}\}/.test(workflow), false, 'an unrendered variable was shipped');
  rmSync(root, { recursive: true, force: true });
});

test('a project with no lint script gets no empty lint instruction', () => {
  const root = mkdtempSync(join(tmpdir(), 'agentic-sdlc-'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'bare', scripts: { test: 'vitest' } }));

  apply({ root, packId: 'minimal', version: VERSION, force: false, dryRun: false, prune: false });
  const workflow = readFileSync(join(root, '.claude/sdlc/workflow.md'), 'utf8');

  assert.ok(workflow.includes('vitest'));
  assert.equal(workflow.includes('- Typecheck: ``'), false, 'rendered an empty command');
  rmSync(root, { recursive: true, force: true });
});
