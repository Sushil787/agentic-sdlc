import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { readIfExists, readJson } from './fsx.js';
import type { Detection, PackId, ProjectCommands } from './types.js';

interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function detectPackageManager(root: string): string {
  if (existsSync(join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(root, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(root, 'bun.lockb')) || existsSync(join(root, 'bun.lock'))) return 'bun';
  return 'npm';
}

/** `npm run lint` / `pnpm lint` / `yarn lint` / `bun run lint`. */
function runScript(pm: string, script: string): string {
  if (pm === 'pnpm' || pm === 'yarn') return `${pm} ${script}`;
  return `${pm} run ${script}`;
}

function nodeFramework(pkg: PackageJson): string {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const has = (name: string): boolean => deps[name] !== undefined;
  if (has('@nestjs/core')) return 'NestJS';
  if (has('next')) return 'Next.js';
  if (has('nuxt')) return 'Nuxt';
  if (has('@remix-run/react')) return 'Remix';
  if (has('@angular/core')) return 'Angular';
  if (has('@sveltejs/kit')) return 'SvelteKit';
  if (has('fastify')) return 'Fastify';
  if (has('express')) return 'Express';
  if (has('koa')) return 'Koa';
  if (has('hono')) return 'Hono';
  if (has('react-native') || has('expo')) return 'React Native';
  if (has('vue')) return 'Vue';
  if (has('react')) return 'React';
  return 'Node.js';
}

const BACKEND_FRAMEWORKS = new Set(['NestJS', 'Fastify', 'Express', 'Koa', 'Hono', 'Node.js']);

const ESLINT_CONFIGS = [
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  'eslint.config.ts',
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
  '.eslintrc.yml',
  '.eslintrc.yaml',
];

function detectNode(root: string, pkg: PackageJson): Detection {
  const pm = detectPackageManager(root);
  const scripts = pkg.scripts ?? {};
  const script = (...names: string[]): string | null => {
    for (const name of names) {
      if (scripts[name] !== undefined) return runScript(pm, name);
    }
    return null;
  };
  const isTs =
    existsSync(join(root, 'tsconfig.json')) ||
    pkg.devDependencies?.typescript !== undefined ||
    pkg.dependencies?.typescript !== undefined;
  const framework = nodeFramework(pkg);

  // Only fall back to a bare `eslint .` when the project actually has ESLint.
  // Telling an agent to run a linter that is not installed wastes a turn and
  // teaches it to ignore failing verification steps.
  const hasEslint =
    ESLINT_CONFIGS.some((file) => existsSync(join(root, file))) ||
    pkg.devDependencies?.eslint !== undefined ||
    pkg.dependencies?.eslint !== undefined;

  const commands: ProjectCommands = {
    install: pm === 'npm' ? 'npm install' : `${pm} install`,
    test: scripts.test !== undefined ? (pm === 'npm' ? 'npm test' : `${pm} test`) : 'npm test',
    lint: script('lint') ?? (hasEslint ? `${pm === 'npm' ? 'npx' : `${pm} dlx`} eslint .` : ''),
    build: script('build') ?? '',
    typecheck: script('typecheck', 'type-check', 'tsc') ?? (isTs ? 'npx tsc --noEmit' : ''),
  };

  return {
    projectName: pkg.name ?? basename(root),
    language: isTs ? 'TypeScript' : 'JavaScript',
    framework,
    packageManager: pm,
    suggestedPack: BACKEND_FRAMEWORKS.has(framework) ? 'backend' : 'full',
    commands,
  };
}

function detectFlutter(root: string, pubspec: string): Detection {
  const nameMatch = /^name:\s*(\S+)/m.exec(pubspec);
  return {
    projectName: nameMatch?.[1] ?? basename(root),
    language: 'Dart',
    framework: /^\s*sdk:\s*flutter/m.test(pubspec) ? 'Flutter' : 'Dart',
    packageManager: 'pub',
    suggestedPack: 'flutter',
    commands: {
      install: 'flutter pub get',
      test: 'flutter test',
      lint: 'dart analyze',
      build: 'flutter build apk --debug',
      typecheck: 'dart analyze',
    },
  };
}

export function detect(root: string): Detection {
  const pubspec = readIfExists(join(root, 'pubspec.yaml'));
  if (pubspec !== null) return detectFlutter(root, pubspec);

  const pkg = readJson<PackageJson>(join(root, 'package.json'));
  if (pkg !== null) return detectNode(root, pkg);

  const goMod = readIfExists(join(root, 'go.mod'));
  if (goMod !== null) {
    const moduleMatch = /^module\s+(\S+)/m.exec(goMod);
    const modulePath = moduleMatch?.[1];
    return {
      projectName: modulePath === undefined ? basename(root) : basename(modulePath),
      language: 'Go',
      framework: 'Go',
      packageManager: 'go',
      suggestedPack: 'backend',
      commands: {
        install: 'go mod download',
        test: 'go test ./...',
        lint: 'go vet ./...',
        build: 'go build ./...',
        typecheck: 'go build ./...',
      },
    };
  }

  if (existsSync(join(root, 'pyproject.toml')) || existsSync(join(root, 'requirements.txt'))) {
    return {
      projectName: basename(root),
      language: 'Python',
      framework: 'Python',
      packageManager: existsSync(join(root, 'uv.lock')) ? 'uv' : 'pip',
      suggestedPack: 'backend',
      commands: {
        install: existsSync(join(root, 'uv.lock')) ? 'uv sync' : 'pip install -r requirements.txt',
        test: 'pytest',
        lint: 'ruff check .',
        build: '',
        typecheck: 'mypy .',
      },
    };
  }

  if (existsSync(join(root, 'Cargo.toml'))) {
    return {
      projectName: basename(root),
      language: 'Rust',
      framework: 'Rust',
      packageManager: 'cargo',
      suggestedPack: 'backend',
      commands: {
        install: 'cargo fetch',
        test: 'cargo test',
        lint: 'cargo clippy -- -D warnings',
        build: 'cargo build',
        typecheck: 'cargo check',
      },
    };
  }

  return {
    projectName: basename(root),
    language: 'Unknown',
    framework: 'Unknown',
    packageManager: 'unknown',
    suggestedPack: 'minimal',
    commands: { install: '', test: '', lint: '', build: '', typecheck: '' },
  };
}

export function describeStack(d: Detection): string {
  if (d.framework === 'Unknown') return 'not detected';
  if (d.framework === d.language) return d.language;
  return `${d.framework} / ${d.language}`;
}

export const PACK_IDS: PackId[] = ['full', 'minimal', 'backend', 'flutter'];

export function isPackId(value: string): value is PackId {
  return (PACK_IDS as string[]).includes(value);
}
