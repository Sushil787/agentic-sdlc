import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { doctor } from './commands/doctor.js';
import { init } from './commands/init.js';
import { list } from './commands/list.js';
import { update } from './commands/update.js';
import { isPackId, PACK_IDS } from './core/detect.js';
import { readJson } from './core/fsx.js';
import { projectRoot } from './core/paths.js';
import { color, log } from './core/ui.js';
import type { PackId } from './core/types.js';

interface ParsedArgs {
  command: string;
  pack: PackId | null;
  root: string;
  yes: boolean;
  force: boolean;
  dryRun: boolean;
  prune: boolean;
  verbose: boolean;
  json: boolean;
  help: boolean;
  version: boolean;
  unknown: string[];
}

function packageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkg = readJson<{ version?: string }>(join(here, '..', 'package.json'));
  return pkg?.version ?? '0.0.0';
}

function parse(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    command: '',
    pack: null,
    root: process.cwd(),
    yes: false,
    force: false,
    dryRun: false,
    prune: false,
    verbose: false,
    json: false,
    help: false,
    version: false,
    unknown: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? '';
    const next = (): string => {
      i += 1;
      return argv[i] ?? '';
    };
    switch (arg) {
      case '--pack':
      case '-p': {
        const value = next();
        if (!isPackId(value)) {
          throw new Error(`Unknown pack "${value}". Choose one of: ${PACK_IDS.join(', ')}.`);
        }
        parsed.pack = value;
        break;
      }
      case '--dir':
      case '-C':
        parsed.root = projectRoot(next());
        break;
      case '--yes':
      case '-y':
        parsed.yes = true;
        break;
      case '--force':
      case '-f':
        parsed.force = true;
        break;
      case '--dry-run':
      case '-n':
        parsed.dryRun = true;
        break;
      case '--prune':
        parsed.prune = true;
        break;
      case '--verbose':
      case '-v':
        parsed.verbose = true;
        break;
      case '--json':
        parsed.json = true;
        break;
      case '--help':
      case '-h':
        parsed.help = true;
        break;
      case '--version':
      case '-V':
        parsed.version = true;
        break;
      default:
        if (arg.startsWith('-')) parsed.unknown.push(arg);
        else if (parsed.command === '') parsed.command = arg;
        else parsed.unknown.push(arg);
    }
  }

  return parsed;
}

function usage(version: string): void {
  log(`
${color.bold('agentic-sdlc')} ${color.gray(`v${version}`)}
${color.gray('An end-to-end software development lifecycle for Claude Code:')}
${color.gray('triage, design, implementation, tests, review and release — as agents.')}

${color.bold('Usage')}
  agentic-sdlc <command> [options]

${color.bold('Commands')}
  init      Install the SDLC into this repository (safe to re-run)
  update    Upgrade the templates, keeping every file you edited
  doctor    Check the installation and live-test the safety guard
  list      Show what a pack contains and what has drifted

${color.bold('Options')}
  -p, --pack <id>   full | minimal | backend | flutter  ${color.gray('(default: detected)')}
  -C, --dir <path>  Target repository            ${color.gray('(default: cwd)')}
  -y, --yes         Skip prompts, take the suggested pack
  -f, --force       Overwrite files you edited   ${color.gray('(keeps a .bak copy)')}
  -n, --dry-run     Show what would change, write nothing
      --prune       Remove files no longer in the pack
  -v, --verbose     List unchanged files too
      --json        Machine-readable output      ${color.gray('(doctor)')}
  -h, --help        This text
  -V, --version     Print the version

${color.bold('Examples')}
  ${color.gray('$')} npx agentic-sdlc init
  ${color.gray('$')} agentic-sdlc init --pack backend --yes
  ${color.gray('$')} agentic-sdlc update --dry-run
  ${color.gray('$')} agentic-sdlc doctor --json
`);
}

export async function run(argv: string[]): Promise<void> {
  const version = packageVersion();
  let args: ParsedArgs;
  try {
    args = parse(argv);
  } catch (error) {
    log(color.red(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
    return;
  }

  if (args.version) {
    log(version);
    return;
  }
  if (args.help || args.command === '' || args.command === 'help') {
    usage(version);
    return;
  }
  if (args.unknown.length > 0) {
    log(color.red(`Unknown option(s): ${args.unknown.join(', ')}`));
    log(color.gray('Run `agentic-sdlc --help` for usage.'));
    process.exitCode = 1;
    return;
  }

  const root = projectRoot(args.root);

  switch (args.command) {
    case 'init':
      process.exitCode = await init({
        root,
        version,
        pack: args.pack,
        yes: args.yes,
        force: args.force,
        dryRun: args.dryRun,
        verbose: args.verbose,
      });
      return;
    case 'update':
    case 'upgrade':
      process.exitCode = update({
        root,
        version,
        pack: args.pack,
        force: args.force,
        dryRun: args.dryRun,
        prune: args.prune,
        verbose: args.verbose,
      });
      return;
    case 'doctor':
    case 'check':
      process.exitCode = doctor({ root, version, json: args.json });
      return;
    case 'list':
    case 'ls':
      process.exitCode = list({ root, pack: args.pack });
      return;
    default:
      log(color.red(`Unknown command "${args.command}".`));
      log(color.gray('Run `agentic-sdlc --help` for usage.'));
      process.exitCode = 1;
  }
}
