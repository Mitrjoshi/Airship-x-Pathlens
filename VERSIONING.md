# Pathlens — Application Versioning Policy

## Purpose

OpenCode must maintain application versioning automatically whenever it implements changes in Pathlens. Follow this policy for every implementation task unless the user explicitly requests otherwise.

## Single source of truth

The React application's `package.json` `version` field is the authoritative application version. In a monorepo, identify the package containing the Pathlens React application and its Vite configuration; do not bump the root or unrelated workspace packages automatically.

Use Semantic Versioning (`MAJOR.MINOR.PATCH`). Do not hardcode version strings in UI components or maintain a separate version constant manually.

The existing Vite integration should expose the version at build time:

```ts
import packageJson from './package.json' with { type: 'json' }

// Inside the existing Vite configuration:
// define: {
//   __APP_VERSION__: JSON.stringify(packageJson.version),
// },
```

Type declaration in `vite-env.d.ts`:

```ts
declare const __APP_VERSION__: string
```

UI usage:

```tsx
<DropdownMenuLabel>Pathlens v{__APP_VERSION__}</DropdownMenuLabel>
```

Preserve existing Vite configuration and other environment declarations.

## Version increment rules

| Change | Increment | Example |
| --- | --- | --- |
| Bug fixes, UI refinements, copy changes, performance improvements, compatible security fixes, behavior-preserving production refactors | PATCH | 1.2.3 → 1.2.4 |
| New user-facing features, compatible integrations or meaningful new capabilities | MINOR | 1.2.3 → 1.3.0 |
| Breaking public API, SDK, configuration or compatibility changes | MAJOR | 1.2.3 → 2.0.0 |
| Read-only audits, explanations, plans, tests-only changes, internal documentation-only changes, or no effective product change | NONE | 1.2.3 → 1.2.3 |

A minor increment resets PATCH to zero. A major increment resets MINOR and PATCH to zero. For `0.x` development releases, use PATCH for fixes and MINOR for features or breaking changes; do not promote to `1.0.0` without explicit user approval. Do not create prerelease versions unless requested.

## Mandatory implementation workflow

1. Read this policy and identify the actual frontend package and current version before making changes.
2. Implement the requested changes and inspect the resulting diff.
3. Classify the effective product changes using the table above. If multiple categories apply, choose the highest applicable increment.
4. Run relevant tests, type checks, lint checks and build checks as appropriate.
5. For a successfully implemented qualifying change, update the frontend `package.json` version exactly once for the entire task, not once per file, fix, or tool call. Treat follow-up fixes within the same unfinished task as part of the same increment.
6. Update the applicable lockfile metadata if required by the repository's existing package manager. Do not upgrade dependencies or regenerate unrelated lockfile sections just to change the version.
7. Update the existing changelog, or create `CHANGELOG.md` at the application package root if no canonical changelog exists. Add a concise entry under the new version and current date, describing actual changes. If the app has a separate structured changelog source, follow its existing conventions and keep it synchronized without introducing duplicate sources unnecessarily.
8. Verify the version is consistent across package metadata, changelog and the Vite build. Report the previous version, new version, increment type and reason in the completion summary.

## Guardrails

- Never bump versions for planning, read-only work, failed or reverted implementations, or repeated validation runs.
- Never increment again merely because the version or changelog was edited.
- Preserve unrelated user changes and inspect any existing uncommitted version edits before modifying them. Avoid overwriting or double-bumping a version already changed for the same task.
- Do not create Git commits, Git tags, releases, deployments, or publish packages unless explicitly requested.
- Respect explicit version instructions from the user, including requests to skip a version bump.
- Do not modify backend or SDK package versions unless their own versioning policy or the user's request requires it. Backend changes affecting the Pathlens product may still qualify for an application version bump.
- If validation fails and cannot be resolved, report the failure and defer the automatic version increment.

## Changelog format

Use only relevant sections and describe completed changes, not planned work.

```md
## [1.3.0] - YYYY-MM-DD

### Added
- Added a new analytics capability.

### Changed
- Improved workspace navigation.

### Fixed
- Resolved a dashboard loading issue.
```

## Completion summary example

```text
Version: 1.2.3 → 1.3.0 (MINOR)
Reason: Added a backward-compatible analytics feature.
Changelog: Updated.
Validation: Passed.
```

For non-qualifying tasks, report `Version: unchanged` and the reason.
