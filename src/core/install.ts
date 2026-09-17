import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { readIfExists, sha256, writeFileEnsured } from './fsx.js';
import { CLAUDE_DIR, templatesDir } from './paths.js';
import { render } from './render.js';
import type {
  FileResult,
  Manifest,
  ManifestFileEntry,
  Pack,
  RenderContext,
} from './types.js';

export interface InstallOptions {
  root: string;
  pack: Pack;
  context: RenderContext;
  manifest: Manifest | null;
  version: string;
  force: boolean;
  dryRun: boolean;
  prune: boolean;
}

export interface InstallPlan {
  results: FileResult[];
  files: Record<string, ManifestFileEntry>;
  backups: string[];
}

const destinationOf = (templateRelativePath: string): string =>
  `${CLAUDE_DIR}/${templateRelativePath}`;

function readTemplate(templateRelativePath: string, context: RenderContext): string {
  const source = readIfExists(join(templatesDir, templateRelativePath));
  if (source === null) {
    throw new Error(`Template missing from the installed package: ${templateRelativePath}`);
  }
  return render(source, context);
}

/**
 * Installs the pack's files, treating three cases differently:
 * untouched files we own are upgraded, files the user edited are left alone,
 * and files that were never ours are never silently replaced.
 */
export function installFiles(options: InstallOptions): InstallPlan {
  const { root, pack, context, manifest, version, force, dryRun, prune } = options;
  const results: FileResult[] = [];
  const files: Record<string, ManifestFileEntry> = {};
  const backups: string[] = [];
  const priorFiles = manifest?.files ?? {};

  const write = (absolutePath: string, content: string): void => {
    if (!dryRun) writeFileEnsured(absolutePath, content);
  };

  const backup = (absolutePath: string, current: string): void => {
    const target = `${absolutePath}.bak`;
    if (!dryRun) writeFileEnsured(target, current);
    backups.push(target);
  };

  for (const templateRelativePath of pack.files) {
    const path = destinationOf(templateRelativePath);
    const absolutePath = join(root, path);
    const desired = readTemplate(templateRelativePath, context);
    const desiredHash = sha256(desired);
    const prior = priorFiles[path];
    const current = readIfExists(absolutePath);

    if (current === null) {
      write(absolutePath, desired);
      results.push({ path, status: 'created' });
      files[path] = { hash: desiredHash, version };
      continue;
    }

    const currentHash = sha256(current);

    if (currentHash === desiredHash) {
      results.push({ path, status: 'unchanged' });
      files[path] = { hash: desiredHash, version };
      continue;
    }

    const ours = prior !== undefined;
    const untouchedSinceWeWroteIt = ours && prior.hash === currentHash;

    if (untouchedSinceWeWroteIt) {
      write(absolutePath, desired);
      results.push({ path, status: 'updated' });
      files[path] = { hash: desiredHash, version };
      continue;
    }

    if (force) {
      backup(absolutePath, current);
      write(absolutePath, desired);
      results.push({ path, status: 'overwritten' });
      files[path] = { hash: desiredHash, version };
      continue;
    }

    results.push({ path, status: ours ? 'modified-kept' : 'foreign-kept' });
    // Keep the old ownership record so a later --force still knows this file is ours.
    if (prior !== undefined) files[path] = prior;
  }

  const shipped = new Set(pack.files.map(destinationOf));
  for (const [path, entry] of Object.entries(priorFiles)) {
    if (shipped.has(path)) continue;
    const absolutePath = join(root, path);
    const current = readIfExists(absolutePath);
    if (current === null) continue;
    const untouched = sha256(current) === entry.hash;
    if (prune && untouched) {
      if (!dryRun && existsSync(absolutePath)) rmSync(absolutePath);
      results.push({ path, status: 'pruned' });
      continue;
    }
    results.push({ path, status: 'orphaned' });
    files[path] = entry;
  }

  return { results, files, backups };
}
