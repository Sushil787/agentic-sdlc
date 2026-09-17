import type { Pack, PackId, SettingsContribution } from './types.js';

const GUARD = 'node "${CLAUDE_PROJECT_DIR}/.claude/hooks/guard.mjs"';

/** Both guards run the same script; the matcher decides which rule set applies. */
const GUARDS: SettingsContribution['guards'] = [
  { matcher: 'Bash', command: GUARD },
  { matcher: 'Write|Edit|MultiEdit|NotebookEdit', command: GUARD },
];

/** Read rules are a second layer under the hook: they stop secrets reaching context at all. */
const SECRET_DENY = [
  'Read(./.env)',
  'Read(./.env.*)',
  'Read(./**/.env)',
  'Read(./**/.env.*)',
  'Read(./**/*.pem)',
  'Read(./**/*.p12)',
  'Read(./**/id_rsa)',
  'Read(./**/id_ed25519)',
  'Read(./**/*.keystore)',
  'Read(./**/*.jks)',
  'Read(./secrets/**)',
  'Read(./**/service-account*.json)',
  'Read(./**/google-services.json)',
];

/** Prefix rules the permission system can reject before the hook ever spawns. */
const DESTRUCTIVE_DENY = [
  'Bash(rm -rf /:*)',
  'Bash(rm -rf ~:*)',
  'Bash(sudo rm:*)',
  'Bash(git push --force:*)',
  'Bash(git push -f:*)',
  'Bash(git reset --hard:*)',
  'Bash(git clean -fd:*)',
  'Bash(npm publish:*)',
  'Bash(npm unpublish:*)',
  'Bash(terraform destroy:*)',
  'Bash(kubectl delete:*)',
  'Bash(docker system prune:*)',
];

const READONLY_ALLOW = [
  'Bash(git status:*)',
  'Bash(git diff:*)',
  'Bash(git log:*)',
  'Bash(git branch:*)',
  'Bash(git show:*)',
  'Bash(ls:*)',
  'Bash(cat:*)',
  'Bash(rg:*)',
  'Bash(grep:*)',
  'Bash(find:*)',
];

const ASK_BEFORE = ['Bash(git commit:*)', 'Bash(git push:*)', 'Bash(gh pr create:*)'];

function settings(extraAllow: string[] = [], extraDeny: string[] = []): SettingsContribution {
  return {
    allow: [...READONLY_ALLOW, ...extraAllow],
    deny: [...SECRET_DENY, ...DESTRUCTIVE_DENY, ...extraDeny],
    ask: [...ASK_BEFORE],
    guards: GUARDS,
  };
}

const SHARED_FILES = ['hooks/guard.mjs', 'hooks/guard.config.json', 'sdlc/workflow.md'];

const SKILL_COMMIT = 'skills/commit-and-pr/SKILL.md';
const SKILL_TESTS = 'skills/test-conventions/SKILL.md';
const SKILL_RELEASE = 'skills/release-checklist/SKILL.md';

const NODE_ALLOW = [
  'Bash(npm test:*)',
  'Bash(npm run lint:*)',
  'Bash(npm run build:*)',
  'Bash(npm run typecheck:*)',
  'Bash(npx tsc --noEmit:*)',
  'Bash(pnpm test:*)',
  'Bash(pnpm lint:*)',
  'Bash(yarn test:*)',
];

const FLUTTER_ALLOW = [
  'Bash(flutter test:*)',
  'Bash(flutter analyze:*)',
  'Bash(dart analyze:*)',
  'Bash(dart format:*)',
  'Bash(flutter pub get:*)',
];

export const PACKS: Record<PackId, Pack> = {
  full: {
    id: 'full',
    label: 'Full SDLC',
    hint: 'plan -> implement -> test -> review -> ship',
    description:
      'Every agent, command and skill: triage, planning, implementation, tests, code review, security review, PR shipping, and deploy preflight.',
    files: [
      'agents/triage.md',
      'agents/planner.md',
      'agents/developer.md',
      'agents/tester.md',
      'agents/reviewer.md',
      'agents/security-reviewer.md',
      'agents/deployer.md',
      'commands/triage.md',
      'commands/plan.md',
      'commands/implement.md',
      'commands/test.md',
      'commands/review.md',
      'commands/ship.md',
      'commands/deploy.md',
      'commands/sdlc.md',
      SKILL_COMMIT,
      SKILL_TESTS,
      SKILL_RELEASE,
      ...SHARED_FILES,
    ],
    settings: settings(NODE_ALLOW),
  },
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    hint: 'plan + review only',
    description: 'Just the planner and reviewer, plus the safety hooks. A light touch for existing repos.',
    files: ['agents/planner.md', 'agents/reviewer.md', 'commands/plan.md', 'commands/review.md', ...SHARED_FILES],
    settings: settings(),
  },
  backend: {
    id: 'backend',
    label: 'Backend',
    hint: 'API/service work, migration-aware',
    description:
      'The full loop tuned for services: contract-first planning, migration safety, a security review pass, and deploy preflight.',
    files: [
      'agents/triage.md',
      'agents/planner.md',
      'agents/developer.md',
      'agents/tester.md',
      'agents/reviewer.md',
      'agents/security-reviewer.md',
      'agents/deployer.md',
      'commands/triage.md',
      'commands/plan.md',
      'commands/implement.md',
      'commands/test.md',
      'commands/review.md',
      'commands/ship.md',
      'commands/deploy.md',
      SKILL_COMMIT,
      SKILL_TESTS,
      SKILL_RELEASE,
      ...SHARED_FILES,
    ],
    settings: settings(NODE_ALLOW, [
      'Bash(psql:*)',
      'Bash(mysql:*)',
      'Bash(mongo:*)',
      'Bash(redis-cli flushall:*)',
      'Bash(redis-cli flushdb:*)',
    ]),
  },
  flutter: {
    id: 'flutter',
    label: 'Flutter',
    hint: 'widget tests, dart analyze',
    description: 'The full loop tuned for Flutter: widget/golden tests and analyzer-clean implementation.',
    files: [
      'agents/triage.md',
      'agents/planner.md',
      'agents/developer.md',
      'agents/tester.md',
      'agents/reviewer.md',
      'commands/triage.md',
      'commands/plan.md',
      'commands/implement.md',
      'commands/test.md',
      'commands/review.md',
      'commands/ship.md',
      SKILL_COMMIT,
      SKILL_TESTS,
      ...SHARED_FILES,
    ],
    settings: settings(FLUTTER_ALLOW),
  },
};

export function getPack(id: PackId): Pack {
  return PACKS[id];
}

export function packList(): Pack[] {
  return [PACKS.full, PACKS.minimal, PACKS.backend, PACKS.flutter];
}
