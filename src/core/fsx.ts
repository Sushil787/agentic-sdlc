import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

export function sha256(content: string): string {
  // Normalise line endings so a CRLF checkout does not read as a local edit.
  return createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex');
}

export function readIfExists(file: string): string | null {
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

export function writeFileEnsured(file: string, content: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content, 'utf8');
}

export function readJson<T>(file: string): T | null {
  const raw = readIfExists(file);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** True when the file exists but is not parseable JSON. */
export function isBrokenJson(file: string): boolean {
  const raw = readIfExists(file);
  if (raw === null) return false;
  try {
    JSON.parse(raw);
    return false;
  } catch {
    return true;
  }
}

export function writeJson(file: string, value: unknown): void {
  writeFileEnsured(file, `${JSON.stringify(value, null, 2)}\n`);
}

/** Every file under `dir`, as paths relative to `dir` with forward slashes. */
export function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const visit = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) out.push(relative(dir, full).split(sep).join('/'));
    }
  };
  visit(dir);
  return out.sort();
}

export function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}
