# Repository Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo. Run commands from the root; use `pnpm --filter <package> <script>` for focused work.
- Apps are `@pathlens/web`, `@airship/web`, `@pathlens/api`, `@airship/api`, `@pathlens/tracker`, and `@pathlens/snapshot-worker`. Shared packages are `@workspace/ui`, `@workspace/contracts`, and `@workspace/backend-types`.
- Read `apps/airship-web/AGENTS.md` before changing Airship web code. Add shared shadcn components with `pnpm --filter @workspace/ui exec shadcn add <component>` and import them from `@workspace/ui/components/*`.

## Commands

- `pnpm verify` runs Turbo lint, typecheck, and build. Other root checks are `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm format:check`.
- Use `pnpm --filter @pathlens/web dev`, `pnpm --filter @airship/web dev`, or `pnpm --filter @pathlens/api dev` for focused development. There is no general test suite; the configured test is `pnpm --filter @pathlens/api test:geoip`.
- For API schema changes, run `pnpm --filter @pathlens/api generate` then `pnpm --filter @pathlens/api migrate`. Do not hand-edit `apps/pathlens-api/drizzle/meta/**`; use `push` only for deliberate direct synchronization.
- Snapshot local capture needs copied `.env` values, a private S3 bucket, a LocalStack SQS queue, and one-time `pnpm --filter @pathlens/snapshot-worker install-browser`; then run `pnpm --filter @pathlens/snapshot-worker local`. Build before its `start` script. See its README for deployment.
- `pnpm layer <package-name>` writes the production Lambda layer to gitignored `lambda-layers/`.

## Boundaries

- Both web apps use TanStack file routes under `src/routes`; Vite generates `src/routeTree.gen.ts`. Never edit that file directly.
- Pathlens API starts at `apps/pathlens-api/src/server.ts` on port `8080`, mounts routes under `/api`, and loads `.env` in its scripts. Drizzle CLI loads `dotenv/config` and requires `DATABASE_URL`.
- Airship API only serves `/health` and defaults to port `8081`; `PORT` overrides it.

## Runtime Contracts

- In `apps/pathlens-api/src/routes/index.ts`, keep `/events`, `/replay`, and `/billing` before `ApiKeyMiddleware`; later routes require `x-api-key === INTERNAL_API_SECRET`. Those three route groups retain their route-specific auth/ingestion middleware.
- Keep the Stripe webhook before `express.json()` in `apps/pathlens-api/src/app.ts`; signature verification needs the raw request bytes.
- Encrypted tracker requests require `X-Project-Key`, and decrypted project IDs must match it. JWT signing and verification require `JWT_SECRET`.
- Preserve Pathlens web's `VITE_API_BASE_URL`, `VITE_API_KEY`, `VITE_TRACKER_SCRIPT_URL`, and `pathlens-token` localStorage key.
- Tracker entrypoint is `apps/pathlens-tracker/src/index.ts`; build emits minified IIFE `dist/tracker.global.js`. `BASE_API_URL` is injected by tsup; script tags require `data-project-id` and support `data-api-url` and `data-replay-api-url` overrides. Check `src/utils.ts` and `src/replay.ts` when changing endpoint defaults.

## Style

- Local `.prettierrc` files override the root: Pathlens web uses single quotes/no semicolons; Airship web and `packages/ui` use double quotes/no semicolons; API and tracker use double quotes/semicolons. Prettier sorts Tailwind classes.
- Web apps, `packages/ui`, and the snapshot worker reject unused locals/parameters and use `erasableSyntaxOnly`; avoid TypeScript syntax requiring runtime emission.
