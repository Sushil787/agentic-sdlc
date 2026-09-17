import { detect } from './detect.js';
import { installFiles, type InstallPlan } from './install.js';
import { emptyManifest, readManifest, writeManifest } from './manifest.js';
import { getPack } from './packs.js';
import { applySettings, planSettings, type SettingsPlan } from './settings.js';
import type { Detection, Manifest, Pack, PackId, RenderContext } from './types.js';

export interface ApplyOptions {
  root: string;
  packId: PackId;
  version: string;
  force: boolean;
  dryRun: boolean;
  prune: boolean;
}

export interface ApplyResult {
  pack: Pack;
  detection: Detection;
  install: InstallPlan;
  settings: SettingsPlan | null;
  manifest: Manifest;
  /** True when settings.json exists but could not be parsed; nothing was written. */
  settingsUnreadable: boolean;
}

export function buildContext(
  detection: Detection,
  packId: PackId,
  version: string,
): RenderContext {
  return {
    ...detection.commands,
    projectName: detection.projectName,
    language: detection.language,
    framework: detection.framework,
    pack: packId,
    cliVersion: version,
  };
}

export function apply(options: ApplyOptions): ApplyResult {
  const { root, packId, version, force, dryRun, prune } = options;
  const detection = detect(root);
  const pack = getPack(packId);
  const previous = readManifest(root);
  const context = buildContext(detection, packId, version);

  const install = installFiles({
    root,
    pack,
    context,
    manifest: previous,
    version,
    force,
    dryRun,
    prune,
  });

  const settings = planSettings(root, pack.settings, previous);
  if (settings !== null && !dryRun) applySettings(root, settings);

  const manifest: Manifest = previous ?? emptyManifest(packId, detection, version);
  manifest.version = version;
  manifest.pack = packId;
  manifest.updatedAt = new Date().toISOString();
  manifest.detection = {
    language: detection.language,
    framework: detection.framework,
    packageManager: detection.packageManager,
  };
  manifest.files = install.files;
  if (settings !== null) manifest.settings = settings.owned;

  if (!dryRun) writeManifest(root, manifest);

  return { pack, detection, install, settings, manifest, settingsUnreadable: settings === null };
}
