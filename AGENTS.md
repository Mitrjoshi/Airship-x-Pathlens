# Repository Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo. Run commands from the root; use `pnpm --filter <package> <script>` for focused work.
- Apps are `@pathlens/web`, `@airship/web`, `@pathlens/api`, `@airship/api`, `@pathlens/tracker`, and `@pathlens/snapshot-worker`. Shared UI is `@workspace/ui`, browser-safe schemas are `@workspace/contracts`, and server-only types are `@workspace/backend-types`.
- Read `apps/airship-web/AGENTS.md` before changing Airship web code. Add shared shadcn primitives with `pnpm --filter @workspace/ui exec shadcn add <component>` and import them from `@workspace/ui/components/*`.

## Commands

- `pnpm dev` runs all persistent tasks. Focused examples: `pnpm --filter @pathlens/web dev`, `pnpm --filter @airship/web dev`, and `pnpm --filter @pathlens/api dev`.
- Verification commands are `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm verify`, and `pnpm format:check`; `pnpm verify` runs lint, typecheck, and build through Turbo.
- There is no general test suite. The configured test is `pnpm --filter @pathlens/api test:geoip`.
- For API schema changes, run `pnpm --filter @pathlens/api generate` then `pnpm --filter @pathlens/api migrate`. Never hand-edit `apps/pathlens-api/drizzle/meta/**`; use `push` only for deliberate direct synchronization.
- Snapshot local capture requires copied `.env` values, a private S3 bucket, a LocalStack SQS queue, and one-time `pnpm --filter @pathlens/snapshot-worker install-browser`; run it with `pnpm --filter @pathlens/snapshot-worker local`. Build before its `start` script. See its README for deployment.
- `pnpm layer <package-name>` writes the production Lambda layer to gitignored `lambda-layers/`.

## Boundaries

- Both web apps use TanStack file routes under `src/routes`; Vite generates `src/routeTree.gen.ts`. Do not edit that file directly.
- Pathlens API entrypoint is `apps/pathlens-api/src/server.ts` on port `8080`, mounted under `/api`. Its `dev`, `start`, and maintenance scripts load `apps/pathlens-api/.env`; Drizzle CLI loads `dotenv/config` and needs `DATABASE_URL`.
- Airship API only serves `/health` and defaults to port `8081`; `PORT` overrides it.

## Runtime Contracts

- In `apps/pathlens-api/src/routes/index.ts`, keep `/events`, `/replay`, and `/billing` before the global `ApiKeyMiddleware`; routes mounted after it require `x-api-key` to equal `INTERNAL_API_SECRET`. Tracker POST ingestion, replay ingestion, and billing auth have route-specific middleware.
- The Stripe webhook is mounted before `express.json()` in `apps/pathlens-api/src/app.ts`; preserve raw request bytes for signature verification.
- Encrypted tracker requests require `X-Project-Key`, and decrypted payload project IDs must match that key. JWT signing and verification require `JWT_SECRET`.
- Preserve Pathlens web's `VITE_API_BASE_URL`, `VITE_API_KEY`, `VITE_TRACKER_SCRIPT_URL`, and `pathlens-token` localStorage key.
- Tracker entrypoint is `apps/pathlens-tracker/src/index.ts`; `build` emits minified IIFE `dist/tracker.global.js`. `BASE_API_URL` is injected by `tsup`; script tags require `data-project-id` and accept `data-api-url` and `data-replay-api-url` overrides. Check both `src/utils.ts` and `src/replay.ts` when changing endpoint defaults.
- Snapshot worker requires `DATABASE_URL`, `AWS_REGION`, and `S3_BUCKET`; local credentials use `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, while Lambda uses its IAM role. `SNAPSHOT_SETTLE_DELAY_MS` is optional.

## Style

- Local `.prettierrc` files override the root: Pathlens web uses single quotes/no semicolons; Airship web and `packages/ui` use double quotes/no semicolons; API and tracker use double quotes/semicolons. Prettier sorts Tailwind classes.
- Web apps, `packages/ui`, and the snapshot worker enforce unused checks and `erasableSyntaxOnly`; avoid TypeScript syntax requiring runtime emission.
