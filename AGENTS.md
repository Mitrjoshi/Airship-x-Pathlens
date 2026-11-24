<!-- intent-skills:start -->

## Skill Loading

Use the repository’s installed Intent. If it is unavailable, report the missing dependency instead of downloading a replacement.
Before editing files for a substantial task:

- Run `pnpm exec intent list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm exec intent load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->

# Repository Guide

## Workspace and commands

- Use pnpm 11 (`pnpm@11.22.0`) from the repository root; focus commands with `pnpm --filter <package> <script>`.
- The workspace contains `apps/pathlens-web` (Vite/TanStack Router dashboard), `apps/pathlens-api` (Express/PostgreSQL API), `apps/pathlens-tracker` (browser IIFE), `apps/pathlens-heatmap-proxy` plus its fixture app, and `apps/pathlens-snapshot-worker` (SQS/Lambda). The root README's Airship apps are stale; neither exists in this checkout.
- `pnpm verify` runs `turbo run lint typecheck build` with task dependencies; it does not run tests or formatting checks. Only `@pathlens/web` currently defines lint.
- Use `pnpm format:check` for non-mutating formatting checks and `pnpm secrets:scan` for the repository secret scanner.
- Web `typecheck` is only `tsc --noEmit`; use `pnpm --filter @pathlens/web build` (`tsc -b && vite build`) for the full referenced-project check.
- API focused suites use `pnpm --filter @pathlens/api test:<name>`; see its `package.json` for suite names. For one module-mocking test: `pnpm --filter @pathlens/api exec node --experimental-test-module-mocks --import tsx --test src/controllers/password-reset.controller.test.ts`. Preserve these Node flags when narrowing other module-mocking suites.
- Other focused suites are `pnpm --filter @pathlens/tracker test:queue` / `test:replay`, `pnpm --filter @pathlens/snapshot-worker test`, and `pnpm --filter @pathlens/heatmap-proxy test` / `test:browser` / `test:browser:js` / `test:framework`. Proxy browser tests need Chromium; `test:framework` and `preview:manual` build the React/animation/Next fixtures first.
- Proxy normal typecheck excludes `*.e2e.ts`; `pnpm --filter @pathlens/heatmap-proxy typecheck:e2e` separately checks `src/browser.e2e.ts`, not all browser suites.

## Boundaries and generated artifacts

- `@workspace/contracts` is browser-safe shared schemas; `@workspace/backend-types` is server-only. Both publish runtime code from `dist`, so build them before direct backend execution on a clean checkout: `pnpm --filter @workspace/contracts build` and `pnpm --filter @workspace/backend-types build`. API `dev` does not build them automatically.
- Add web routes under `apps/pathlens-web/src/routes`; TanStack generates `src/routeTree.gen.ts`—do not edit it.
- Shared shadcn primitives belong in `packages/ui`: `pnpm --filter @workspace/ui exec shadcn add <component>`, imported via `@workspace/ui/components/*`. This uses Base UI (`@base-ui/react`, `base-nova`), not Radix. Keep product-specific features in the app.
- Tracker `dev` only serves files; it does not rebuild. Run `pnpm --filter @pathlens/tracker build` to produce `apps/pathlens-tracker/dist/tracker.global.js`. `API_URL` / `REPLAY_API_URL` (or `BASE_API_URL`) are baked in at build time; unset values target a deployed API, not localhost.
- Formatting differs: root/web use single quotes without semicolons; API/tracker use double quotes with semicolons; UI uses double quotes without semicolons.

## API, database, and environment

- API schema source is `apps/pathlens-api/src/db/schema.ts`. Run `pnpm --filter @pathlens/api generate` before `pnpm --filter @pathlens/api migrate`; do not hand-edit `drizzle/meta/**`. Reserve `push` for deliberate direct database synchronization.
- `.env` and `.env.*` are ignored except `.env.example`. API environment loading is relative to the process working directory: `.env.local` overrides `.env`, but existing process variables win. Use package-filtered commands so the API loads its own files.
- API entrypoints: `src/server.ts` listens on port `8080`; `src/app.ts` mounts `src/routes/index.ts` at `/api`. Keep billing webhook `express.raw()` before `express.json()` to preserve Stripe signatures.
- In `apps/pathlens-api/src/routes/index.ts`, ingestion/replay/tracking-config, billing, OAuth login/callbacks, integration callbacks, and internal heatmap validation intentionally precede `ApiKeyMiddleware`; preserve their own authentication. Routes after it require `x-api-key` equal to `INTERNAL_API_SECRET`.
- Snapshot local execution needs PostgreSQL, AWS values, a private S3 bucket, LocalStack SQS on `4566`, and Chromium. Follow `apps/pathlens-snapshot-worker/README.md`; create the queue, run `pnpm --filter @pathlens/snapshot-worker install-browser`, then `pnpm --filter @pathlens/snapshot-worker local` (not `dev`) to consume it.
- Root `deploy:heatmap-proxy`, `deploy:snapshot-worker`, and `deploy:pathlens-api` scripts build Linux/amd64 containers, push to ECR, and immediately update existing Lambda code; they are not build-only commands. They use the active AWS identity and `AWS_REGION` (default `ap-south-1`).

## Application Versioning

Always read and follow `VERSIONING.md` before implementing
any changes to Pathlens.

Automatically increment the application version based on
the nature of the completed changes.

Update the application package.json, relevant lockfile
metadata, and changelog without requiring explicit
instructions from the user.

Increment the version only once per completed task.
Versioning is a mandatory part of implementation.
