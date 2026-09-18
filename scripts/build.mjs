#!/usr/bin/env node
// Compiles src/ to dist/ and copies the (non-TS) template tree alongside it.
import { execFileSync } from 'node:child_process';
import { cpSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Run tsc's JS entry point with the current node rather than node_modules/.bin/tsc:
// on Windows that shim is a .cmd file, which execFileSync can't launch without a shell.
const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc');

rmSync(join(root, 'dist'), { recursive: true, force: true });
execFileSync(process.execPath, [tsc, '-p', join(root, 'tsconfig.json')], { stdio: 'inherit' });
cpSync(join(root, 'src', 'templates'), join(root, 'dist', 'templates'), { recursive: true });
console.log('build: dist/ ready');
