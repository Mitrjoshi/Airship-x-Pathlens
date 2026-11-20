# Repository Guide

## Commands and verification

- Use pnpm 11 (`pnpm@11.22.0`) from the repository root; focus commands with `pnpm --filter <package> <script>`.
- `pnpm verify` runs `turbo run lint typecheck build`, not a sequential lint → typecheck → build pipeline. It does not run tests or formatting checks. Only `@pathlens/web` currently defines a lint script; there is no root test script.
- Use `pnpm format:check` for non-mutating formatting checks and `pnpm secrets:scan` for the repository secret scanner.
- Web `typecheck` runs `tsc --noEmit` against a solution config with no files; use `pnpm --filter @pathlens/web build` (`tsc -b && vite build`) to check the referenced app and Vite projects.
- API suites: `pnpm --filter @pathlens/api test:<name>`, where `<name>` is `notifications`, `geoip`, `pagespeed`, `search-console`, `heatmaps`, `preview-sessions`, `authorization`, or `events`. The last three scripts supply Node's experimental module-mocking flag; preserve it when narrowing a test.
- Other suites: `pnpm --filter @pathlens/tracker test:queue` / `test:replay`, `pnpm --filter @pathlens/snapshot-worker test`, and `pnpm --filter @pathlens/heatmap-proxy test` / `test:browser` / `test:browser:js` / `test:framework`. Proxy browser suites need Playwright Chromium (`pnpm --filter @pathlens/heatmap-proxy exec playwright install chromium`); `test:framework` and `preview:manual` also build the React/animation/Next fixtures first.

## Boundaries and generated files

- Despite the root README, there are no Airship apps in the current workspace. Pathlens uses a Vite/TanStack Router dashboard, Express/PostgreSQL API, browser tracker IIFE, heatmap proxy with browser fixtures, and SQS/Lambda snapshot worker.
- `@workspace/contracts` is browser-safe shared schemas; `@workspace/backend-types` is server-only. Both publish runtime code from `dist`, so build them before direct backend execution on a clean checkout: `pnpm --filter @workspace/contracts build` and `pnpm --filter @workspace/backend-types build`. API `dev` does not build them automatically.
- Add web routes under `apps/pathlens-web/src/routes`; TanStack generates `src/routeTree.gen.ts`—do not edit it.
- Shared shadcn primitives belong in `packages/ui`: `pnpm --filter @workspace/ui exec shadcn add <component>`, imported via `@workspace/ui/components/*`. Keep product-specific features in the app.
- Tracker `dev` only serves files; it does not rebuild. Run `pnpm --filter @pathlens/tracker build` to produce `apps/pathlens-tracker/dist/tracker.global.js`. `API_URL` / `REPLAY_API_URL` (or `BASE_API_URL`) are baked in at build time; unset values target a deployed API, not localhost.
- Formatting differs: root/web use single quotes without semicolons; API/tracker use double quotes with semicolons; UI uses double quotes without semicolons.

## Database, environment, and request wiring

- API schema source is `apps/pathlens-api/src/db/schema.ts`. Run `pnpm --filter @pathlens/api generate` before `pnpm --filter @pathlens/api migrate`; do not hand-edit `drizzle/meta/**`. Reserve `push` for deliberate direct database synchronization.
- `.env` and `.env.*` are ignored except `.env.example`. API environment loading is relative to the process working directory: `.env.local` overrides `.env`, but existing process variables win. Use package-filtered commands so the API loads its own files.
- API entrypoints: `src/server.ts` listens on port `8080`; `src/app.ts` mounts `src/routes/index.ts` at `/api`. Keep billing webhook `express.raw()` before `express.json()` to preserve Stripe signatures.
- In `apps/pathlens-api/src/routes/index.ts`, ingestion/replay/tracking-config, billing, OAuth login/callbacks, integration callbacks, and internal heatmap validation intentionally precede `ApiKeyMiddleware`; preserve their own authentication. Routes after it require `x-api-key` equal to `INTERNAL_API_SECRET`.
- Snapshot local execution needs PostgreSQL, AWS values, a private S3 bucket, LocalStack SQS on `4566`, and Chromium. Follow `apps/pathlens-snapshot-worker/README.md` for queue creation and setup; run `pnpm --filter @pathlens/snapshot-worker install-browser`, then `pnpm --filter @pathlens/snapshot-worker local` (not `dev`) to consume the local queue.
