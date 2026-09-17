import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { apply } from '../core/apply.js';
import { detect, describeStack } from '../core/detect.js';
import { readManifest } from '../core/manifest.js';
import { packList } from '../core/packs.js';
import { CLAUDE_DIR } from '../core/paths.js';
import { confirm, isInteractive, select } from '../core/prompt.js';
import { color, heading, log, symbols } from '../core/ui.js';
import type { PackId } from '../core/types.js';
import { reportFiles, reportNextSteps, reportSettings } from './report.js';

export interface InitFlags {
  root: string;
  version: string;
  pack: PackId | null;
  yes: boolean;
  force: boolean;
  dryRun: boolean;
  verbose: boolean;
}

export async function init(flags: InitFlags): Promise<number> {
  const { root, version } = flags;
  const detection = detect(root);
  const existing = readManifest(root);

  log();
  log(`${symbols.robot} ${color.bold('Agentic SDLC')}`);
  log();
  log(`${color.gray('Project:  ')}${detection.projectName}`);
  log(`${color.gray('Stack:    ')}${describeStack(detection)}`);
  log(`${color.gray('Tests:    ')}${detection.commands.test || color.gray('not detected')}`);
  if (existsSync(join(root, CLAUDE_DIR))) {
    const note = existing === null ? 'exists (not managed by agentic-sdlc yet)' : `managed, pack: ${existing.pack}`;
    log(`${color.gray('.claude:  ')}${note}`);
  }
  log();

  let packId = flags.pack ?? existing?.pack ?? null;
  if (packId === null) {
    if (flags.yes || !isInteractive()) {
      packId = detection.suggestedPack;
      log(`${color.gray('Pack:     ')}${packId} ${color.gray('(auto-selected)')}`);
    } else {
      const packs = packList();
      const suggestedIndex = packs.findIndex((pack) => pack.id === detection.suggestedPack);
      packId = await select(
        'Choose workflow:',
        packs.map((pack) => ({
          value: pack.id,
          label: pack.label.padEnd(10),
          hint: pack.id === detection.suggestedPack ? `${pack.hint}  (suggested)` : pack.hint,
        })),
        suggestedIndex < 0 ? 0 : suggestedIndex,
      );
      log();
    }
  }

  if (flags.force && !flags.yes && !flags.dryRun && isInteractive()) {
    const proceed = await confirm(
      `${symbols.warn} --force overwrites files you edited (a .bak copy is kept). Continue?`,
      false,
    );
    if (!proceed) {
      log(color.gray('Nothing changed.'));
      return 1;
    }
  }

  const result = apply({
    root,
    packId,
    version,
    force: flags.force,
    dryRun: flags.dryRun,
    prune: false,
  });

  if (flags.dryRun) heading(`Dry run — nothing was written (pack: ${result.pack.label})`);
  else heading(`${result.pack.label} — ${result.pack.description}`);

  reportFiles(result.install.results, flags.verbose);
  reportSettings(result);

  if (result.settingsUnreadable) return 1;
  if (flags.dryRun) {
    log();
    log(color.gray('Re-run without --dry-run to apply.'));
    return 0;
  }

  reportNextSteps(result);
  return 0;
}
