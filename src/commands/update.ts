import { apply } from '../core/apply.js';
import { readManifest } from '../core/manifest.js';
import { color, heading, log, symbols } from '../core/ui.js';
import type { PackId } from '../core/types.js';
import { reportFiles, reportSettings } from './report.js';

export interface UpdateFlags {
  root: string;
  version: string;
  pack: PackId | null;
  force: boolean;
  dryRun: boolean;
  prune: boolean;
  verbose: boolean;
}

export function update(flags: UpdateFlags): number {
  const existing = readManifest(flags.root);
  if (existing === null && flags.pack === null) {
    log(`${symbols.fail} No agentic-sdlc installation found here.`);
    log(color.gray('  Run `agentic-sdlc init` first, or pass --pack to install a specific one.'));
    return 1;
  }

  const packId = flags.pack ?? existing?.pack ?? 'full';
  const from = existing?.version ?? 'none';

  log();
  log(`${symbols.robot} ${color.bold('Agentic SDLC')} ${color.gray(`update ${from} -> ${flags.version}`)}`);

  const result = apply({
    root: flags.root,
    packId,
    version: flags.version,
    force: flags.force,
    dryRun: flags.dryRun,
    prune: flags.prune,
  });

  heading(flags.dryRun ? `Dry run — nothing was written (pack: ${result.pack.label})` : result.pack.label);
  reportFiles(result.install.results, flags.verbose);
  reportSettings(result);

  if (result.settingsUnreadable) return 1;

  const kept = result.install.results.filter(
    (entry) => entry.status === 'modified-kept' || entry.status === 'foreign-kept',
  );
  const orphaned = result.install.results.filter((entry) => entry.status === 'orphaned');

  log();
  if (kept.length > 0) {
    log(
      color.gray(
        `${kept.length} file(s) you edited were preserved. Use --force to take the new templates (your copy is saved as .bak).`,
      ),
    );
  }
  if (orphaned.length > 0) {
    log(color.gray(`${orphaned.length} file(s) are no longer part of this pack. Use --prune to remove them.`));
  }
  if (kept.length === 0 && orphaned.length === 0 && !flags.dryRun) {
    log(color.gray('Up to date.'));
  }
  if (flags.dryRun) log(color.gray('Re-run without --dry-run to apply.'));

  return 0;
}
