// Checks that the pieces of a pack actually refer to each other: every agent a
// command delegates to is installed alongside it, every reference file a skill
// links to ships with it, and every template variable is one the CLI renders.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { PACKS, packList } from '../dist/core/packs.js';
import { templatesDir } from '../dist/core/paths.js';

const read = (relativePath) => readFileSync(join(templatesDir, relativePath), 'utf8');

const RENDER_KEYS = new Set([
  'projectName',
  'language',
  'framework',
  'pack',
  'cliVersion',
  'install',
  'test',
  'lint',
  'build',
  'typecheck',
]);

const frontmatterName = (source) => {
  const match = /^---\n([\s\S]*?)\n---/.exec(source);
  if (match === null) return null;
  const name = /^name:\s*(\S+)/m.exec(match[1]);
  return name === null ? null : name[1];
};

test('every file a pack lists exists in the template tree', () => {
  for (const pack of packList()) {
    for (const file of pack.files) {
      assert.ok(existsSync(join(templatesDir, file)), `${pack.id}: missing template ${file}`);
    }
  }
});

test('no template file is orphaned from every pack', () => {
  const used = new Set(packList().flatMap((pack) => pack.files));
  const all = new Set(Object.values(PACKS).flatMap((pack) => pack.files));
  for (const file of all) assert.ok(used.has(file), `${file} is unreachable`);
});

test('agent files declare a name matching their filename', () => {
  for (const file of new Set(packList().flatMap((p) => p.files)).values()) {
    if (!file.startsWith('agents/')) continue;
    const expected = file.slice('agents/'.length).replace(/\.md$/, '');
    assert.equal(frontmatterName(read(file)), expected, `${file} name mismatch`);
  }
});

test('every agent a command delegates to ships in the same pack', () => {
  for (const pack of packList()) {
    const agents = new Set(
      pack.files.filter((f) => f.startsWith('agents/')).map((f) => f.slice(7).replace(/\.md$/, '')),
    );
    for (const file of pack.files.filter((f) => f.startsWith('commands/'))) {
      const body = read(file);
      // Matches: delegate to the `planner` subagent / delegate to `reviewer`
      for (const match of body.matchAll(/[Dd]elegate to (?:the )?`([a-z-]+)`/g)) {
        assert.ok(
          agents.has(match[1]),
          `${pack.id}: ${file} delegates to "${match[1]}" but that agent is not in the pack`,
        );
      }
    }
  }
});

test('every reference file a skill links to ships in the same pack', () => {
  for (const pack of packList()) {
    const owned = new Set(pack.files);
    for (const file of pack.files.filter((f) => f.endsWith('/SKILL.md'))) {
      const body = read(file);
      for (const match of body.matchAll(/\[[^\]]+\]\((?!https?:)([^)]+)\)/g)) {
        const target = `${dirname(file)}/${match[1]}`;
        assert.ok(owned.has(target), `${pack.id}: ${file} links to ${match[1]}, which is not in the pack`);
      }
    }
  }
});

test('every template variable is one the renderer provides', () => {
  for (const file of new Set(packList().flatMap((p) => p.files)).values()) {
    const body = read(file);
    for (const match of body.matchAll(/\{\{#if (\w+)\}\}/g)) {
      assert.ok(RENDER_KEYS.has(match[1]), `${file}: unknown conditional {{#if ${match[1]}}}`);
    }
    for (const match of body.matchAll(/\{\{(\w+)\}\}/g)) {
      assert.ok(RENDER_KEYS.has(match[1]), `${file}: unknown variable {{${match[1]}}}`);
    }
    const opens = (body.match(/\{\{#if /g) ?? []).length;
    const closes = (body.match(/\{\{\/if\}\}/g) ?? []).length;
    assert.equal(opens, closes, `${file}: unbalanced {{#if}} / {{/if}}`);
  }
});

test('agents and commands agree on where each artifact lives', () => {
  const canonical = {
    intent: '.claude/sdlc/intent/',
    specs: '.claude/sdlc/specs/',
    plans: '.claude/sdlc/plans/',
    releases: '.claude/sdlc/releases/',
  };
  const seen = new Set();
  for (const file of new Set(packList().flatMap((p) => p.files)).values()) {
    if (!file.startsWith('agents/') && !file.startsWith('commands/')) continue;
    for (const match of read(file).matchAll(/\.claude\/sdlc\/([a-z-]+)\//g)) {
      seen.add(match[1]);
      assert.ok(
        Object.keys(canonical).includes(match[1]),
        `${file} writes to .claude/sdlc/${match[1]}/, which is not a stage of the loop`,
      );
    }
  }
  for (const stage of Object.keys(canonical)) {
    assert.ok(seen.has(stage), `no agent or command produces the ${stage} artifact`);
  }
});

test('read-only reviewers hold no write tools', () => {
  for (const name of ['reviewer', 'security-reviewer']) {
    const tools = /^tools:\s*(.+)$/m.exec(read(`agents/${name}.md`))[1];
    for (const forbidden of ['Write', 'Edit', 'MultiEdit']) {
      assert.ok(!tools.includes(forbidden), `${name} must not hold ${forbidden}`);
    }
  }
});

test('agents told to write an artifact actually hold the Write tool', () => {
  for (const name of ['triage', 'planner', 'deployer', 'developer', 'tester']) {
    const body = read(`agents/${name}.md`);
    const tools = /^tools:\s*(.+)$/m.exec(body)[1];
    assert.ok(tools.includes('Write'), `${name} is told to write files but has no Write tool`);
  }
});

test('the workflow doc lists every command the pack installs', () => {
  for (const pack of packList()) {
    if (!pack.files.includes('sdlc/workflow.md')) continue;
    const doc = read('sdlc/workflow.md');
    for (const file of pack.files.filter((f) => f.startsWith('commands/'))) {
      const command = `/${file.slice(9).replace(/\.md$/, '')}`;
      assert.ok(doc.includes(command), `workflow.md does not document ${command}`);
    }
  }
});

test('every command and skill file starts with frontmatter on line one', () => {
  for (const file of new Set(packList().flatMap((p) => p.files)).values()) {
    if (!file.startsWith('commands/') && !file.endsWith('/SKILL.md') && !file.startsWith('agents/')) continue;
    const body = read(file);
    assert.ok(body.startsWith('---\n'), `${file} must open with frontmatter on the first line`);
    assert.ok(/^---\n[\s\S]*?\n---\n/.test(body), `${file} has an unterminated frontmatter block`);
    assert.ok(/^description:\s*\S/m.test(body), `${file} needs a description for auto-delegation`);
  }
});
