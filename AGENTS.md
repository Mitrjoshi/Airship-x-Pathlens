# Repository Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo. Run commands from the root; use `pnpm --filter <package> <script>` for focused work.
- Apps: `@pathlens/web`, `@airship/web`, `@pathlens/api`, `@airship/api`, `@pathlens/tracker`, and `@pathlens/snapshot-worker`. Shared packages: `@workspace/ui`, `@workspace/contracts`, and `@workspace/backend-types`.
- Read `apps/airship-web/AGENTS.md` before changing Airship web code. Shared shadcn components belong in `packages/ui`; add them with `pnpm --filter @workspace/ui exec shadcn add <component>` and import them from `@workspace/ui/components/*`.

## Commands

- Install with `pnpm install`. Copy the relevant `.env.example` to `.env` before running the Pathlens API or snapshot worker.
- `pnpm verify` runs Turbo `lint`, `typecheck`, and `build`; use `pnpm --filter <package> lint|typecheck|build` for focused checks. Use `pnpm format:check` for formatting verification.
- Run all development servers with `pnpm dev`, or focus with `pnpm --filter @pathlens/web dev`, `pnpm --filter @airship/web dev`, `pnpm --filter @pathlens/api dev`, or `pnpm --filter @airship/api dev`.
- The only configured test script is `pnpm --filter @pathlens/api test:geoip`.
- Build the tracker with `pnpm --filter @pathlens/tracker build`; its output is the minified IIFE consumed by the web setup instructions.
- For API schema changes, run `pnpm --filter @pathlens/api generate` then `pnpm --filter @pathlens/api migrate`. Never hand-edit `apps/pathlens-api/drizzle/meta/**`; use `push` only for deliberate direct synchronization.
- Local snapshot capture needs a private S3 bucket, the LocalStack queue from `aws --endpoint-url http://localhost:4566 sqs create-queue --queue-name pathlens-snapshot-worker-queue`, and one-time `pnpm --filter @pathlens/snapshot-worker install-browser`; then run `pnpm --filter @pathlens/snapshot-worker local`. Build before `start`, which runs `dist/index.js`. See `apps/pathlens-snapshot-worker/README.md` for deployment.
- `pnpm layer <package-name>` builds a production Lambda layer under gitignored `lambda-layers/`.

## Boundaries

- Both web apps use TanStack file routes under `src/routes`; the Vite plugin generates `src/routeTree.gen.ts`. Never edit that file directly.
- Pathlens API entrypoint is `apps/pathlens-api/src/server.ts` on port `8080`, with routes under `/api`; its dev/start scripts load `.env`. Airship API serves `/health` on port `8081` unless `PORT` is set.

## Runtime Contracts

- In `apps/pathlens-api/src/routes/index.ts`, keep `/events`, `/replay`, `/billing`, and the public GitHub OAuth endpoints before `ApiKeyMiddleware`; later routes require `x-api-key === INTERNAL_API_SECRET`.
- Keep the Stripe webhook before `express.json()` in `apps/pathlens-api/src/app.ts`; signature verification needs raw request bytes.
- Encrypted tracker requests require `X-Project-Key`, and every decrypted project ID must match it. JWT signing and verification require `JWT_SECRET`.
- Preserve Pathlens web's `VITE_API_BASE_URL`, `VITE_API_KEY`, `VITE_TRACKER_SCRIPT_URL`, and `pathlens-token` localStorage key.
- Tracker entrypoint is `apps/pathlens-tracker/src/index.ts`; tsup emits the minified IIFE `dist/tracker.global.js` and injects `BASE_API_URL`. Script tags require `data-project-id` and may override endpoints with `data-api-url` and `data-replay-api-url`.

## Style

- Local `.prettierrc` files override the root: Pathlens web and the snapshot worker use single quotes/no semicolons; Airship web and `packages/ui` use double quotes/no semicolons; API and tracker use double quotes/semicolons. Prettier sorts Tailwind classes where configured.
- Web apps, `packages/ui`, and the snapshot worker reject unused locals/parameters and use `erasableSyntaxOnly`; avoid TypeScript syntax requiring runtime emission.
