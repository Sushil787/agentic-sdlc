import { join } from 'node:path';
import { readJson, writeJson } from './fsx.js';
import { MANIFEST_FILE } from './paths.js';
import type { Detection, Manifest, PackId } from './types.js';

export function manifestPath(root: string): string {
  return join(root, MANIFEST_FILE);
}

export function readManifest(root: string): Manifest | null {
  const manifest = readJson<Manifest>(manifestPath(root));
  if (manifest === null || manifest.name !== 'agentic-sdlc') return null;
  // Tolerate manifests written by older versions that lack newer sections.
  manifest.files ??= {};
  manifest.settings ??= { allow: [], deny: [], ask: [], guards: [] };
  return manifest;
}

export function writeManifest(root: string, manifest: Manifest): void {
  writeJson(manifestPath(root), manifest);
}

export function emptyManifest(pack: PackId, detection: Detection, version: string): Manifest {
  const now = new Date().toISOString();
  return {
    name: 'agentic-sdlc',
    version,
    pack,
    createdAt: now,
    updatedAt: now,
    detection: {
      language: detection.language,
      framework: detection.framework,
      packageManager: detection.packageManager,
    },
    files: {},
    settings: { allow: [], deny: [], ask: [], guards: [] },
  };
}
