import { join } from 'node:path';
import { isBrokenJson, readJson, writeJson } from './fsx.js';
import { SETTINGS_FILE } from './paths.js';
import type { Manifest, SettingsContribution } from './types.js';

const SCHEMA_URL = 'https://json.schemastore.org/claude-code-settings.json';
const HOOK_TIMEOUT_SECONDS = 15;

export interface HookHandler {
  type: string;
  command?: string;
  timeout?: number;
  [key: string]: unknown;
}

export interface HookMatcherEntry {
  matcher?: string;
  hooks: HookHandler[];
}

export interface ClaudeSettings {
  $schema?: string;
  permissions?: {
    allow?: string[];
    deny?: string[];
    ask?: string[];
    [key: string]: unknown;
  };
  hooks?: Record<string, HookMatcherEntry[]>;
  [key: string]: unknown;
}

export interface SettingsPlan {
  next: ClaudeSettings;
  owned: Manifest['settings'];
  added: string[];
  removed: string[];
  existed: boolean;
}

export function settingsPath(root: string): string {
  return join(root, SETTINGS_FILE);
}

const guardKey = (matcher: string, command: string): string => `${matcher}::${command}`;

type Bucket = 'allow' | 'deny' | 'ask';

function mergeBucket(
  current: string[],
  previouslyOwned: string[],
  desired: string[],
  added: string[],
  removed: string[],
  bucket: Bucket,
): string[] {
  // Rules we installed in an earlier version but no longer ship are retired;
  // anything the user added by hand is left exactly where it is.
  const retired = new Set(previouslyOwned.filter((rule) => !desired.includes(rule)));
  const next = current.filter((rule) => {
    if (retired.has(rule)) {
      removed.push(`${bucket}: ${rule}`);
      return false;
    }
    return true;
  });
  for (const rule of desired) {
    if (!next.includes(rule)) {
      next.push(rule);
      added.push(`${bucket}: ${rule}`);
    }
  }
  return next;
}

/**
 * Builds the settings.json we want without discarding anything the user put there.
 * Returns null when the existing file is present but unparseable.
 */
export function planSettings(
  root: string,
  contribution: SettingsContribution,
  manifest: Manifest | null,
): SettingsPlan | null {
  const file = settingsPath(root);
  if (isBrokenJson(file)) return null;

  const existing = readJson<ClaudeSettings>(file);
  const existed = existing !== null;
  const next: ClaudeSettings = existing === null ? {} : structuredClone(existing);
  const previous = manifest?.settings ?? { allow: [], deny: [], ask: [], guards: [] };
  const added: string[] = [];
  const removed: string[] = [];

  next.$schema ??= SCHEMA_URL;
  const permissions = { ...(next.permissions ?? {}) };
  permissions.allow = mergeBucket(
    permissions.allow ?? [],
    previous.allow,
    contribution.allow,
    added,
    removed,
    'allow',
  );
  permissions.deny = mergeBucket(
    permissions.deny ?? [],
    previous.deny,
    contribution.deny,
    added,
    removed,
    'deny',
  );
  permissions.ask = mergeBucket(
    permissions.ask ?? [],
    previous.ask,
    contribution.ask,
    added,
    removed,
    'ask',
  );
  next.permissions = permissions;

  const desiredGuardKeys = contribution.guards.map((g) => guardKey(g.matcher, g.command));
  const retiredGuards = new Set(previous.guards.filter((key) => !desiredGuardKeys.includes(key)));

  const hooks: Record<string, HookMatcherEntry[]> = { ...(next.hooks ?? {}) };
  let preToolUse = [...(hooks.PreToolUse ?? [])];

  if (retiredGuards.size > 0) {
    preToolUse = preToolUse
      .map((entry) => {
        const kept = entry.hooks.filter((handler) => {
          const key = guardKey(entry.matcher ?? '', String(handler.command ?? ''));
          if (retiredGuards.has(key)) {
            removed.push(`hook: ${entry.matcher ?? '*'}`);
            return false;
          }
          return true;
        });
        return { ...entry, hooks: kept };
      })
      .filter((entry) => entry.hooks.length > 0);
  }

  for (const guard of contribution.guards) {
    let entry = preToolUse.find((candidate) => candidate.matcher === guard.matcher);
    if (entry === undefined) {
      entry = { matcher: guard.matcher, hooks: [] };
      preToolUse.push(entry);
    }
    const present = entry.hooks.some((handler) => handler.command === guard.command);
    if (!present) {
      entry.hooks.push({ type: 'command', command: guard.command, timeout: HOOK_TIMEOUT_SECONDS });
      added.push(`hook: PreToolUse(${guard.matcher})`);
    }
  }

  if (preToolUse.length > 0) hooks.PreToolUse = preToolUse;
  else delete hooks.PreToolUse;
  if (Object.keys(hooks).length > 0) next.hooks = hooks;

  return {
    next,
    owned: {
      allow: [...contribution.allow],
      deny: [...contribution.deny],
      ask: [...contribution.ask],
      guards: desiredGuardKeys,
    },
    added,
    removed,
    existed,
  };
}

export function applySettings(root: string, plan: SettingsPlan): void {
  writeJson(settingsPath(root), plan.next);
}

/** True when the guard hook is wired up for every matcher the pack expects. */
export function guardsInstalled(root: string, contribution: SettingsContribution): boolean {
  const settings = readJson<ClaudeSettings>(settingsPath(root));
  const preToolUse = settings?.hooks?.PreToolUse ?? [];
  return contribution.guards.every((guard) =>
    preToolUse.some(
      (entry) =>
        entry.matcher === guard.matcher &&
        entry.hooks.some((handler) => handler.command === guard.command),
    ),
  );
}
