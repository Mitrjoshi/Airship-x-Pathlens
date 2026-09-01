# Agent Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo. Run commands from the root; use `pnpm --filter <package> <script>` for focused work.
- Product packages are `@pathlens/web`, `@airship/web`, `@pathlens/api`, `@airship/api`, `@pathlens/tracker`, and `@pathlens/snapshot-worker`. Shared code belongs in `@workspace/ui`, browser-safe `@workspace/contracts`, or server-only `@workspace/backend-types`.
- Read `apps/airship-web/AGENTS.md` before changing Airship web code. Add shared shadcn primitives in `packages/ui` with `pnpm --filter @workspace/ui exec shadcn add <component>` and import them from `@workspace/ui/components/*`.

## Commands

- `pnpm dev` runs all persistent tasks. Focused development: `pnpm --filter @pathlens/web dev`, `pnpm --filter @airship/web dev`, or `pnpm --filter @pathlens/api dev`.
- `pnpm verify` runs `lint`, `typecheck`, and `build`; use the root `pnpm lint`, `pnpm typecheck`, `pnpm build`, or `pnpm format:check` for focused checks.
- There is no general test suite. The available test is `pnpm --filter @pathlens/api test:geoip`.
- For API schema changes, run `pnpm --filter @pathlens/api generate` then `pnpm --filter @pathlens/api migrate`; never hand-edit `apps/pathlens-api/drizzle/meta/**`. `push` is only for deliberate direct synchronization; `studio` opens Drizzle Studio.
- The snapshot worker requires `pnpm --filter @pathlens/snapshot-worker install-browser` once before local capture. Use `pnpm --filter @pathlens/snapshot-worker local` for its LocalStack SQS consumer; build before its `start` script. Local runs require `.env` values, a private S3 bucket, and a LocalStack queue. See its README for Docker/ECR/SAM deployment.
- `pnpm layer <package-name>` writes the production Lambda layer to gitignored `lambda-layers/`.

## Boundaries

- Both web apps use TanStack file routes under `src/routes`; Vite generates `src/routeTree.gen.ts`. Do not edit that generated file.
- Pathlens API starts from `apps/pathlens-api/src/server.ts` on port `8080` and mounts routes under `/api`. Its `dev`, `start`, and `backfill:campaigns` scripts explicitly load `apps/pathlens-api/.env`; Drizzle CLI uses `dotenv/config` and needs `DATABASE_URL`.
- API protected routes require `x-api-key` equal to `INTERNAL_API_SECRET`; JWT operations use `JWT_SECRET`. The Airship API is only `/health` and defaults to port `8081` (`PORT` overrides it).

## Runtime Contracts

- Keep `/events` and `/replay` before `ApiKeyMiddleware` in `apps/pathlens-api/src/routes/index.ts`: tracker ingestion is unauthenticated by `x-api-key`; all later routes require it.
- Encrypted tracker requests require `X-Project-Key`, and every decrypted payload project ID must equal that key.
- Preserve Pathlens web's `VITE_API_BASE_URL`, `VITE_API_KEY`, `VITE_TRACKER_SCRIPT_URL`, and `pathlens-token` localStorage key.
- Tracker entrypoint is `apps/pathlens-tracker/src/index.ts`; `build` emits the minified IIFE `dist/tracker.global.js`. `BASE_API_URL` is injected by `tsup`; script tags require `data-project-id` and support `data-api-url` and `data-replay-api-url` overrides. Check `src/utils.ts` and `src/replay.ts` separately when changing endpoint defaults.
- Snapshot worker requires `DATABASE_URL`, `AWS_REGION`, and `S3_BUCKET`; local AWS credentials use `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, while Lambda uses its IAM role. `SNAPSHOT_SETTLE_DELAY_MS` is optional.

## Style

- Local `.prettierrc` files override the root: Pathlens web uses single quotes/no semicolons; Airship web and `packages/ui` use double quotes/no semicolons; API and tracker use double quotes/semicolons. Tailwind classes are sorted by Prettier.
- Web apps, `packages/ui`, and the snapshot worker enforce unused checks and `erasableSyntaxOnly`; avoid TypeScript syntax requiring runtime emission.
