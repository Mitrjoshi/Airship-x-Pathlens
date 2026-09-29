# Repository Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo. Run commands from the root; use `pnpm --filter <package> <script>` for focused work.
- Apps are `@pathlens/web`, `@airship/web`, `@pathlens/api`, `@airship/api`, `@pathlens/tracker`, and `@pathlens/snapshot-worker`. Shared packages are `@workspace/ui`, `@workspace/contracts`, and `@workspace/backend-types`.
- Read `apps/airship-web/AGENTS.md` before changing Airship web code. Shared shadcn components belong in `packages/ui`; add them with `pnpm --filter @workspace/ui exec shadcn add <component>` and import them from `@workspace/ui/components/*`.

## Commands

- Install from the root with `pnpm install`. Copy the relevant `.env.example` to `.env` before running the Pathlens API or snapshot worker.
- `pnpm verify` runs Turbo `lint`, `typecheck`, and `build`; use `pnpm --filter <package> lint|typecheck|build` for focused checks. Use `pnpm format:check` to check formatting.
- Development entrypoints are `pnpm --filter @pathlens/web dev`, `pnpm --filter @airship/web dev`, `pnpm --filter @pathlens/api dev`, and `pnpm --filter @airship/api dev`.
- There is no general test suite; the only configured test is `pnpm --filter @pathlens/api test:geoip`.
- For API schema changes, run `pnpm --filter @pathlens/api generate` followed by `pnpm --filter @pathlens/api migrate`. Do not hand-edit `apps/pathlens-api/drizzle/meta/**`; use `push` only for deliberate direct synchronization.
- Snapshot local capture needs a private S3 bucket, the LocalStack queue created with `aws --endpoint-url http://localhost:4566 sqs create-queue --queue-name pathlens-snapshot-worker-queue`, and one-time `pnpm --filter @pathlens/snapshot-worker install-browser`; then run `pnpm --filter @pathlens/snapshot-worker local`. Build before `start`, which runs `dist/index.js`.
- `pnpm layer <package-name>` builds a production Lambda layer under gitignored `lambda-layers/`.

## Boundaries

- Both web apps use TanStack file routes under `src/routes`; Vite generates `src/routeTree.gen.ts`. Never edit that generated file directly.
- Pathlens API starts at `apps/pathlens-api/src/server.ts` on port `8080`, mounts routes under `/api`, and its dev/start scripts load `.env`. Airship API serves `/health` on port `8081` unless `PORT` is set.

## Runtime Contracts

- In `apps/pathlens-api/src/routes/index.ts`, keep `/events`, `/replay`, and `/billing` before `ApiKeyMiddleware`; later routes require `x-api-key === INTERNAL_API_SECRET`.
- Keep the Stripe webhook before `express.json()` in `apps/pathlens-api/src/app.ts`; signature verification needs raw request bytes.
- Encrypted tracker requests require `X-Project-Key`, and decrypted project IDs must match it. JWT signing and verification require `JWT_SECRET`.
- Preserve Pathlens web's `VITE_API_BASE_URL`, `VITE_API_KEY`, `VITE_TRACKER_SCRIPT_URL`, and `pathlens-token` localStorage key.
- Tracker entrypoint is `apps/pathlens-tracker/src/index.ts`; its build emits the minified IIFE `dist/tracker.global.js`. `BASE_API_URL` is injected by tsup, while script tags require `data-project-id` and may override endpoints with `data-api-url` and `data-replay-api-url`.

## Style

- Local `.prettierrc` files override the root: Pathlens web uses single quotes/no semicolons; Airship web and `packages/ui` use double quotes/no semicolons; API and tracker use double quotes/semicolons. Prettier sorts Tailwind classes.
- Web apps, `packages/ui`, and the snapshot worker reject unused locals/parameters and use `erasableSyntaxOnly`; avoid TypeScript syntax requiring runtime emission.
