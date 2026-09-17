import { join } from 'node:path';
import { readIfExists, sha256 } from '../core/fsx.js';
import { readManifest } from '../core/manifest.js';
import { getPack, packList } from '../core/packs.js';
import { CLAUDE_DIR } from '../core/paths.js';
import { bullet, color, heading, log, symbols } from '../core/ui.js';
import type { PackId } from '../core/types.js';

export interface ListFlags {
  root: string;
  pack: PackId | null;
}

const KINDS: { prefix: string; title: string }[] = [
  { prefix: 'agents/', title: 'Agents' },
  { prefix: 'commands/', title: 'Commands' },
  { prefix: 'skills/', title: 'Skills' },
  { prefix: 'hooks/', title: 'Hooks' },
  { prefix: 'sdlc/', title: 'Docs' },
];

const displayName = (templatePath: string): string => {
  if (templatePath.startsWith('commands/')) return `/${templatePath.slice(9).replace(/\.md$/, '')}`;
  if (templatePath.startsWith('agents/')) return templatePath.slice(7).replace(/\.md$/, '');
  if (templatePath.startsWith('skills/')) return templatePath.slice(7).replace(/\/SKILL\.md$/, '');
  return templatePath.split('/').slice(1).join('/');
};

export function list(flags: ListFlags): number {
  const manifest = readManifest(flags.root);
  const target = flags.pack ?? manifest?.pack ?? null;

  if (target === null) {
    heading('Available packs');
    for (const pack of packList()) {
      bullet(color.cyan(pack.label.padEnd(9)), color.gray(pack.description));
    }
    log();
    log(color.gray('Show one with `agentic-sdlc list --pack full`.'));
    log(color.gray('Nothing is installed here yet — run `agentic-sdlc init`.'));
    return 0;
  }

  const pack = getPack(target);
  const installed = manifest?.pack === target;

  heading(`${pack.label}${installed ? color.green('  (installed)') : ''}`);
  log(color.gray(`  ${pack.description}`));

  for (const kind of KINDS) {
    const all = pack.files.filter((file) => file.startsWith(kind.prefix));
    // A skill is represented by its SKILL.md; its reference files ride along.
    const files = kind.prefix === 'skills/' ? all.filter((file) => file.endsWith('/SKILL.md')) : all;
    if (files.length === 0) continue;
    log();
    log(`  ${color.bold(kind.title)}`);
    for (const templatePath of files) {
      const path = `${CLAUDE_DIR}/${templatePath}`;
      let state = color.gray('not installed');
      let symbol = symbols.skip;
      if (installed) {
        const current = readIfExists(join(flags.root, path));
        const entry = manifest?.files[path];
        if (current === null) {
          state = color.red('missing');
          symbol = symbols.fail;
        } else if (entry !== undefined && sha256(current) !== entry.hash) {
          state = color.yellow('edited locally');
          symbol = symbols.warn;
        } else {
          state = color.gray('current');
          symbol = symbols.ok;
        }
      }
      const refs =
        kind.prefix === 'skills/'
          ? all.filter((file) => file.startsWith(`${templatePath.split('/').slice(0, 2).join('/')}/`)).length - 1
          : 0;
      const suffix = refs > 0 ? color.gray(`  +${refs} ref`) : '';
      log(`    ${symbol} ${displayName(templatePath).padEnd(22)} ${state}${suffix}`);
    }
  }

  log();
  log(`  ${color.bold('Permissions')}`);
  log(
    color.gray(
      `    ${pack.settings.allow.length} allowed · ${pack.settings.deny.length} denied · ${pack.settings.ask.length} ask-first · ${pack.settings.guards.length} guard hooks`,
    ),
  );
  log();
  return 0;
}
