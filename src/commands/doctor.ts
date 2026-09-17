import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { isBrokenJson, readIfExists, sha256 } from '../core/fsx.js';
import { readManifest } from '../core/manifest.js';
import { getPack } from '../core/packs.js';
import { CLAUDE_DIR, MANIFEST_FILE, SETTINGS_FILE } from '../core/paths.js';
import { guardsInstalled } from '../core/settings.js';
import { bullet, color, heading, log, symbols } from '../core/ui.js';

type Level = 'ok' | 'warn' | 'fail';

interface Check {
  level: Level;
  label: string;
  detail?: string;
}

export interface DoctorFlags {
  root: string;
  version: string;
  json: boolean;
}

function has(command: string, args: string[]): boolean {
  const result = spawnSync(command, args, { stdio: 'ignore', shell: process.platform === 'win32' });
  return result.status === 0;
}

/** Fires a fake dangerous tool call at the installed guard and checks it blocks. */
function guardBlocks(guardPath: string, payload: unknown): boolean {
  const result = spawnSync(process.execPath, [guardPath], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
  return result.status === 2;
}

export function doctor(flags: DoctorFlags): number {
  const { root } = flags;
  const checks: Check[] = [];
  const push = (level: Level, label: string, detail?: string): void => {
    checks.push(detail === undefined ? { level, label } : { level, label, detail });
  };

  push(
    has('claude', ['--version']) ? 'ok' : 'warn',
    'Claude Code CLI',
    has('claude', ['--version']) ? undefined : 'not on PATH — install it to use the agents',
  );

  const claudeDir = join(root, CLAUDE_DIR);
  if (!existsSync(claudeDir)) {
    push('fail', '.claude directory', 'missing — run `agentic-sdlc init`');
    return finish(checks, flags);
  }
  push('ok', '.claude directory');

  const manifest = readManifest(root);
  if (manifest === null) {
    push('fail', 'Installation manifest', `${MANIFEST_FILE} missing — run \`agentic-sdlc init\``);
    return finish(checks, flags);
  }
  push(
    manifest.version === flags.version ? 'ok' : 'warn',
    `Installed pack: ${manifest.pack}`,
    manifest.version === flags.version
      ? `v${manifest.version}`
      : `v${manifest.version} installed, v${flags.version} available — run \`agentic-sdlc update\``,
  );

  const pack = getPack(manifest.pack);
  let missing = 0;
  let drifted = 0;
  for (const templatePath of pack.files) {
    const path = `${CLAUDE_DIR}/${templatePath}`;
    const current = readIfExists(join(root, path));
    if (current === null) {
      missing += 1;
      push('fail', path, 'missing — run `agentic-sdlc update`');
      continue;
    }
    const entry = manifest.files[path];
    if (entry !== undefined && sha256(current) !== entry.hash) drifted += 1;
  }
  if (missing === 0) push('ok', `Pack files (${pack.files.length})`, 'all present');
  if (drifted > 0) {
    push('warn', `Locally edited files (${drifted})`, 'preserved on update; use --force to reset');
  }

  if (isBrokenJson(join(root, SETTINGS_FILE))) {
    push('fail', 'settings.json', 'not valid JSON — Claude Code will ignore it');
  } else if (!existsSync(join(root, SETTINGS_FILE))) {
    push('fail', 'settings.json', 'missing — run `agentic-sdlc update`');
  } else {
    push('ok', 'settings.json', 'valid');
    push(
      guardsInstalled(root, pack.settings) ? 'ok' : 'fail',
      'Guard hooks registered',
      guardsInstalled(root, pack.settings) ? 'PreToolUse' : 'not wired — run `agentic-sdlc update`',
    );
  }

  const guardPath = join(root, CLAUDE_DIR, 'hooks', 'guard.mjs');
  if (existsSync(guardPath)) {
    const blocksRm = guardBlocks(guardPath, {
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'rm -rf /' },
    });
    const blocksSecret = guardBlocks(guardPath, {
      hook_event_name: 'PreToolUse',
      tool_name: 'Write',
      tool_input: { file_path: '.env' },
    });
    push(blocksRm && blocksSecret ? 'ok' : 'fail', 'Safety guard live-tested', blocksRm && blocksSecret ? 'blocks `rm -rf /` and writes to .env' : 'did not block a known-dangerous call');
  } else {
    push('fail', 'Safety guard', 'hooks/guard.mjs missing');
  }

  const isRepo = existsSync(join(root, '.git'));
  push(isRepo ? 'ok' : 'warn', 'Git repository', isRepo ? undefined : 'not a repo — /ship and /review need git');
  if (isRepo) {
    const remote = spawnSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8' });
    push(
      remote.status === 0 ? 'ok' : 'warn',
      'Git remote',
      remote.status === 0 ? remote.stdout.trim() : 'no origin — /ship cannot open a PR',
    );
  }
  push(has('gh', ['--version']) ? 'ok' : 'warn', 'GitHub CLI', has('gh', ['--version']) ? undefined : 'not installed — /ship and /triage use it');

  return finish(checks, flags);
}

function finish(checks: Check[], flags: DoctorFlags): number {
  const failures = checks.filter((check) => check.level === 'fail').length;
  const warnings = checks.filter((check) => check.level === 'warn').length;

  if (flags.json) {
    log(JSON.stringify({ ok: failures === 0, failures, warnings, checks }, null, 2));
    return failures === 0 ? 0 : 1;
  }

  heading('agentic-sdlc doctor');
  for (const check of checks) {
    const symbol = check.level === 'ok' ? symbols.ok : check.level === 'warn' ? symbols.warn : symbols.fail;
    const detail = check.detail === undefined ? '' : color.gray(`  ${check.detail}`);
    bullet(symbol, `${check.label}${detail}`);
  }
  log();
  if (failures > 0) log(color.red(`${failures} problem(s) to fix.`));
  else if (warnings > 0) log(color.yellow(`Healthy, with ${warnings} optional item(s) missing.`));
  else log(color.green('All good.'));

  return failures === 0 ? 0 : 1;
}
