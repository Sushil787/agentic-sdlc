import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

/** Root of the shipped template tree (dist/templates at runtime). */
export const templatesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates');

export const CLAUDE_DIR = '.claude';
export const MANIFEST_FILE = join(CLAUDE_DIR, '.agentic-sdlc.json');
export const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json');

export function projectRoot(dir?: string): string {
  return resolve(dir ?? process.cwd());
}
