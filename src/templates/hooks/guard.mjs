#!/usr/bin/env node
/**
 * agentic-sdlc safety guard (Claude Code PreToolUse hook).
 *
 * Reads the pending tool call on stdin and blocks it when it matches a rule in
 * guard.config.json. Exit 0 = no opinion, normal permission flow continues.
 * Exit 2 = blocked, and Claude is told why.
 *
 * Edit guard.config.json to tune the rules. This file is upgraded by
 * `agentic-sdlc update`; the config file is yours to keep.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- plumbing

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function loadConfig() {
  try {
    return JSON.parse(readFileSync(join(HERE, 'guard.config.json'), 'utf8'));
  } catch {
    return {};
  }
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.stderr.write(`${reason}\n`);
  process.exit(2);
}

function ask(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

const decide = (severity, reason) => (severity === 'ask' ? ask(reason) : deny(reason));

// ---------------------------------------------------------------- matching

function globToRegExp(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === '*') {
      if (glob[i + 1] === '*') {
        out += '.*';
        i += 1;
        if (glob[i + 1] === '/') i += 1;
      } else {
        out += '[^/]*';
      }
    } else if (char === '?') out += '[^/]';
    else if ('\\^$+.()|[]{}'.includes(char)) out += `\\${char}`;
    else out += char;
  }
  return new RegExp(`^${out}$`, 'i');
}

const normalisePath = (value) => String(value ?? '').replace(/\\/g, '/').replace(/^\.\//, '');

function pathMatches(path, globs) {
  const candidates = [normalisePath(path)];
  const absolute = candidates[0];
  const cwd = normalisePath(process.cwd());
  if (absolute.startsWith(`${cwd}/`)) candidates.push(absolute.slice(cwd.length + 1));
  const base = absolute.split('/').pop() ?? '';
  return globs.find((glob) => {
    const re = globToRegExp(glob);
    return candidates.some((candidate) => re.test(candidate)) || re.test(base);
  });
}

/** Split a shell line into the individual commands it would actually run. */
function splitSegments(command) {
  const segments = [];
  let current = '';
  let quote = null;
  for (let i = 0; i < command.length; i += 1) {
    const char = command[i];
    if (quote !== null) {
      if (char === quote && command[i - 1] !== '\\') quote = null;
      current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    const two = command.slice(i, i + 2);
    if (two === '&&' || two === '||') {
      segments.push(current);
      current = '';
      i += 1;
      continue;
    }
    if (char === ';' || char === '|' || char === '\n') {
      segments.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  segments.push(current);
  return segments.map((segment) => segment.trim()).filter(Boolean);
}

function tokenize(segment) {
  const tokens = segment.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  return tokens.map((token) => token.replace(/^['"]|['"]$/g, ''));
}

/** Drop env assignments and wrappers so `sudo env X=1 rm` still reads as `rm`. */
function effectiveTokens(tokens) {
  const out = [...tokens];
  while (out.length > 0) {
    const head = out[0];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(head) || head === 'command' || head === 'env') out.shift();
    else break;
  }
  return out;
}

const DANGEROUS_RM_TARGETS = new Set(['/', '/*', '~', '~/', '~/*', '$HOME', '$HOME/', '.', './', '..', '../', '*']);

function isDangerousRmTarget(target) {
  const value = target.replace(/\/+$/, '') || '/';
  if (DANGEROUS_RM_TARGETS.has(target) || DANGEROUS_RM_TARGETS.has(value)) return true;
  // Shallow absolute paths: /etc, /usr/lib, /var — never a project directory.
  if (value.startsWith('/') && value.split('/').filter(Boolean).length <= 2) return true;
  if (/^(~|\$HOME)\/[^/]*$/.test(value)) return true;
  return false;
}

function checkRm(tokens) {
  const flags = tokens.filter((token) => token.startsWith('-'));
  const joined = flags.join('');
  const recursive = /r/i.test(joined) || flags.includes('--recursive');
  if (!recursive) return null;
  const targets = tokens.slice(1).filter((token) => !token.startsWith('-'));
  if (targets.length === 0) return null;
  const hit = targets.find(isDangerousRmTarget);
  return hit === undefined ? null : `recursive delete of "${hit}"`;
}

function checkGit(tokens, config) {
  const [, subcommand, ...rest] = tokens;
  const protectedBranches = config.protectedBranches ?? ['main', 'master', 'develop'];
  const isProtected = (name) =>
    protectedBranches.some((branch) =>
      branch.endsWith('*') ? name.startsWith(branch.slice(0, -1)) : name === branch,
    );

  if (subcommand === 'push') {
    const forced = rest.some((token) => token === '--force' || token === '-f');
    if (forced) return 'force push rewrites published history';
    const target = rest.filter((token) => !token.startsWith('-'))[1];
    if (target !== undefined && isProtected(target)) {
      return `direct push to protected branch "${target}" (open a pull request instead)`;
    }
  }
  if (subcommand === 'reset' && rest.includes('--hard')) return 'git reset --hard discards uncommitted work';
  if (subcommand === 'clean' && rest.some((token) => /^-[a-z]*f/.test(token))) {
    return 'git clean -f deletes untracked files permanently';
  }
  if (subcommand === 'checkout' && (rest.includes('.') || (rest.includes('--') && rest.includes('.')))) {
    return 'git checkout . discards uncommitted work';
  }
  if (subcommand === 'branch' && rest.some((token) => token === '-D')) {
    const name = rest.filter((token) => !token.startsWith('-'))[0];
    if (name !== undefined && isProtected(name)) return `force-deleting protected branch "${name}"`;
  }
  return null;
}

const SECRET_READERS = new Set(['cat', 'less', 'more', 'head', 'tail', 'strings', 'xxd', 'od', 'bat', 'nl']);

function checkSecretRead(tokens, secretGlobs) {
  const [command, ...args] = tokens;
  if (!SECRET_READERS.has(command)) return null;
  for (const arg of args) {
    if (arg.startsWith('-')) continue;
    const hit = pathMatches(arg, secretGlobs);
    if (hit !== undefined) return `reading secrets from "${arg}" would put credentials into the transcript`;
  }
  return null;
}

// ---------------------------------------------------------------- rule sets

function checkBash(command, config) {
  const bash = config.bash ?? {};
  const allowPatterns = (bash.allow ?? []).map((source) => new RegExp(source, 'i'));
  if (allowPatterns.some((re) => re.test(command))) return null;

  // Pattern rules run against the whole line first: splitting on `|` would hide
  // the very shape some of them look for, such as `curl ... | sh`.
  for (const rule of bash.deny ?? []) {
    const re = new RegExp(rule.pattern, rule.flags ?? 'i');
    if (re.test(command)) return { severity: rule.severity ?? 'deny', reason: rule.reason };
  }

  for (const segment of splitSegments(command)) {
    const tokens = effectiveTokens(tokenize(segment));
    if (tokens.length === 0) continue;
    const head = tokens[0];

    if (config.blockSudo !== false && head === 'sudo') {
      return { severity: 'deny', reason: 'sudo escalates privileges outside the project sandbox' };
    }

    const bare = head === 'sudo' ? effectiveTokens(tokens.slice(1)) : tokens;
    const name = bare[0];

    if (name === 'rm') {
      const hit = checkRm(bare);
      if (hit !== null) return { severity: 'deny', reason: hit };
    }
    if (name === 'git') {
      const hit = checkGit(bare, config);
      if (hit !== null) return { severity: bash.gitSeverity ?? 'deny', reason: hit };
    }
    const secretHit = checkSecretRead(bare, config.secretPaths ?? []);
    if (secretHit !== null) return { severity: 'deny', reason: secretHit };
  }
  return null;
}

const PATH_INPUT_KEYS = ['file_path', 'notebook_path', 'path'];

function checkWrite(toolInput, config) {
  const paths = config.paths ?? {};
  const targets = [];
  for (const key of PATH_INPUT_KEYS) {
    if (typeof toolInput?.[key] === 'string') targets.push(toolInput[key]);
  }
  for (const edit of toolInput?.edits ?? []) {
    if (typeof edit?.file_path === 'string') targets.push(edit.file_path);
  }

  for (const target of targets) {
    const selfHit = pathMatches(target, paths.selfProtected ?? []);
    if (selfHit !== undefined) {
      return {
        severity: 'deny',
        reason: `"${target}" is the safety guard itself; change it with agentic-sdlc, not from inside a session`,
      };
    }
    const secretHit = pathMatches(target, config.secretPaths ?? []);
    if (secretHit !== undefined) {
      return { severity: 'deny', reason: `"${target}" holds credentials and must be edited by a human` };
    }
    const protectedHit = pathMatches(target, paths.protected ?? []);
    if (protectedHit !== undefined) {
      return { severity: paths.severity ?? 'ask', reason: `"${target}" is a protected path (${protectedHit})` };
    }
  }
  return null;
}

// ---------------------------------------------------------------- entrypoint

const raw = await readStdin();
if (raw.trim() === '') process.exit(0);

let event;
try {
  event = JSON.parse(raw);
} catch {
  process.exit(0);
}

const config = loadConfig();
if (config.mode === 'off') process.exit(0);

const toolName = event.tool_name ?? '';
const toolInput = event.tool_input ?? {};
let verdict = null;

if (toolName === 'Bash' && typeof toolInput.command === 'string') {
  verdict = checkBash(toolInput.command, config);
} else if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(toolName)) {
  verdict = checkWrite(toolInput, config);
}

if (verdict === null) process.exit(0);

if (config.mode === 'warn') {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        additionalContext: `agentic-sdlc guard (warn only): ${verdict.reason}`,
      },
    }),
  );
  process.exit(0);
}

const prefix = verdict.severity === 'ask' ? 'Needs your approval' : 'Blocked by agentic-sdlc guard';
decide(verdict.severity, `${prefix}: ${verdict.reason}.`);
