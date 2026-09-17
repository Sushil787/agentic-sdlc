import { basename } from 'node:path';
import type { ApplyResult } from '../core/apply.js';
import { bullet, color, log, symbols } from '../core/ui.js';
import type { FileResult, FileStatus } from '../core/types.js';

const GROUPS: { status: FileStatus; symbol: string; label: string; note?: string }[] = [
  { status: 'created', symbol: symbols.ok, label: 'Installed' },
  { status: 'updated', symbol: symbols.ok, label: 'Updated' },
  { status: 'overwritten', symbol: symbols.warn, label: 'Overwritten', note: 'previous version saved as .bak' },
  { status: 'unchanged', symbol: symbols.skip, label: 'Already current' },
  { status: 'modified-kept', symbol: symbols.warn, label: 'Kept your edits', note: 'run with --force to take the new template' },
  { status: 'foreign-kept', symbol: symbols.warn, label: 'Left alone (not ours)', note: 'run with --force to adopt it' },
  { status: 'orphaned', symbol: symbols.skip, label: 'No longer in this pack', note: 'run with --prune to remove' },
  { status: 'pruned', symbol: symbols.ok, label: 'Removed' },
];

/** `.claude/agents/planner.md` -> `planner agent`, so the output reads like prose. */
function describe(path: string): string {
  const parts = path.split('/');
  const kind = parts[1] ?? '';
  const name = basename(path, '.md');
  if (kind === 'agents') return `${name} agent`;
  if (kind === 'commands') return `/${name} command`;
  if (kind === 'skills') {
    const skill = parts[2] ?? name;
    return path.endsWith('/SKILL.md') ? `${skill} skill` : `${skill} skill reference (${basename(path)})`;
  }
  if (kind === 'hooks') return `safety hook (${basename(path)})`;
  if (kind === 'sdlc') return 'workflow guide';
  return path;
}

export function reportFiles(results: FileResult[], verbose: boolean): void {
  for (const group of GROUPS) {
    const matching = results.filter((result) => result.status === group.status);
    if (matching.length === 0) continue;
    // Quiet runs collapse the boring "nothing changed" group into one line.
    if (!verbose && group.status === 'unchanged') {
      bullet(group.symbol, color.gray(`${matching.length} files already current`));
      continue;
    }
    for (const result of matching) {
      const suffix = group.note === undefined ? '' : color.gray(`  (${group.note})`);
      bullet(group.symbol, `${group.label} ${describe(result.path)}${suffix}`);
    }
  }
}

export function reportSettings(result: ApplyResult): void {
  if (result.settingsUnreadable) {
    bullet(
      symbols.fail,
      `${color.red('.claude/settings.json is not valid JSON')} — left untouched. Fix it, then re-run.`,
    );
    return;
  }
  const plan = result.settings;
  if (plan === null) return;
  if (plan.added.length === 0 && plan.removed.length === 0) {
    bullet(symbols.skip, color.gray('settings.json already has the permissions and guards'));
    return;
  }
  const verb = plan.existed ? 'Merged into' : 'Created';
  bullet(
    symbols.ok,
    `${verb} settings.json ${color.gray(`(+${plan.added.length} rules, -${plan.removed.length})`)}`,
  );
}

export function reportNextSteps(result: ApplyResult): void {
  const hasTriage = result.pack.files.includes('commands/triage.md');
  log();
  log(color.bold('Ready.'));
  log();
  log('Try:');
  log();
  log(`  ${color.cyan(hasTriage ? '/sdlc <issue>' : '/plan <what you want to change>')}`);
  log(`  ${color.gray('or run')} ${color.cyan('/plan')} ${color.gray('to start at the planning gate')}`);
  log();
  log(color.gray('Committed to the repo, so your team gets the same loop.'));
  log(color.gray('Read .claude/sdlc/workflow.md for the whole flow.'));
}
