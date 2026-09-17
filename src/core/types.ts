export type PackId = 'full' | 'minimal' | 'backend' | 'flutter';

/** Commands the templates are rendered with, so agents run the project's real scripts. */
export interface ProjectCommands {
  install: string;
  test: string;
  lint: string;
  build: string;
  typecheck: string;
}

export interface Detection {
  projectName: string;
  language: string;
  framework: string;
  packageManager: string;
  suggestedPack: PackId;
  commands: ProjectCommands;
}

export interface RenderContext extends ProjectCommands {
  projectName: string;
  language: string;
  framework: string;
  pack: PackId;
  cliVersion: string;
}

export interface SettingsContribution {
  allow: string[];
  deny: string[];
  ask: string[];
  /** Command strings for the PreToolUse guard, keyed by tool matcher. */
  guards: { matcher: string; command: string }[];
}

export interface Pack {
  id: PackId;
  label: string;
  hint: string;
  description: string;
  /** Paths relative to the template root; each installs to `.claude/<path>`. */
  files: string[];
  settings: SettingsContribution;
}

export type FileStatus =
  | 'created'
  | 'updated'
  | 'unchanged'
  | 'modified-kept'
  | 'foreign-kept'
  | 'overwritten'
  | 'orphaned'
  | 'pruned';

export interface FileResult {
  /** Path relative to the project root, forward-slashed. */
  path: string;
  status: FileStatus;
}

export interface ManifestFileEntry {
  hash: string;
  version: string;
}

export interface Manifest {
  name: 'agentic-sdlc';
  version: string;
  pack: PackId;
  createdAt: string;
  updatedAt: string;
  detection: {
    language: string;
    framework: string;
    packageManager: string;
  };
  files: Record<string, ManifestFileEntry>;
  settings: {
    allow: string[];
    deny: string[];
    ask: string[];
    guards: string[];
  };
}
