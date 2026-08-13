# Agent Guide

## Workspace

- This is a pnpm 10 (`pnpm@10.0.0`) Turborepo workspace. Run `pnpm install` at the root; use `pnpm --filter <package> <script>` for focused work.
- Apps are `@pathlens/web`, `@airship/web`, `@pathlens/api`, `@airship/api`, and `@pathlens/tracker`. Shared packages are `@workspace/ui`, `@workspace/contracts`, and `@workspace/backend-types`.
- Keep product features in their owning app. `packages/ui` owns shared shadcn components/hooks/styles, `packages/contracts` owns shared browser-safe schemas/types, and `packages/backend-types` owns server-only types.
- Import shared UI from `@workspace/ui/components/*`. Add shadcn primitives from the root with `pnpm --filter @workspace/ui exec shadcn add <component>`; do not add them to an app.

## Commands

- Root commands are `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm verify`, `pnpm format`, and `pnpm format:check`. `pnpm verify` runs Turborepo `lint`, `typecheck`, and `build`.
- Only the two web apps define `lint`; no test script or test framework is configured. Useful focused checks are `pnpm --filter @pathlens/web lint`, `pnpm --filter @airship/web lint`, `pnpm --filter @pathlens/api typecheck`, and `pnpm --filter @pathlens/tracker build`.
- After an intentional schema change in `apps/pathlens-api/src/db/schema.ts`, generate then apply it with `pnpm --filter @pathlens/api generate` followed by `pnpm --filter @pathlens/api migrate`. Use `push` only for intentional direct synchronization and `studio` for Drizzle Studio.

## Runtime And Env

- `apps/pathlens-api` is an Express/PostgreSQL API mounted at `/api` on hardcoded port `8080`; `apps/airship-api` exposes only `/health` and uses `PORT` or `8081`.
- Pathlens API `dev` and `start` load `apps/pathlens-api/.env` with `tsx --env-file=.env`; provide `DATABASE_URL`, `JWT_SECRET`, and `INTERNAL_API_SECRET`, with PostgreSQL reachable at `DATABASE_URL`.
- The Pathlens web app requires `VITE_API_BASE_URL` and `VITE_API_KEY`. It sends the latter as `x-api-key` and stores the bearer token in localStorage as `pathlens-token`; preserve these names in auth changes.
- The README mentions `.env.example`, but none are checked in. Create ignored local env files in the relevant app directories and never commit their values.
- Preserve API route order: `/events` and `/replay` are mounted before the global `ApiKeyMiddleware`. Ingestion POSTs decrypt an encrypted body, require `X-Project-Key`, and reject payload `projectId` values that do not match it; protected routes use `x-api-key` matching `INTERNAL_API_SECRET`, with JWT and workspace-permission middleware where declared.

## Generated And Style

- Both web apps use file-based TanStack Router routes under `src/routes`; the Vite plugin generates `src/routeTree.gen.ts`. Do not edit generated route trees, `dist/**`, or `apps/pathlens-api/drizzle/meta/**` manually.
- Drizzle migrations belong in `apps/pathlens-api/drizzle/`; generated route trees and that directory are ignored by the root formatter.
- The tracker entrypoint is `apps/pathlens-tracker/src/index.ts` and builds a minified IIFE at `dist/tracker.global.js`. It requires `data-project-id`, defaults to `http://localhost:8080/api/events` and `http://localhost:8080/api/replay/chunks`, encrypts payloads with the project ID, and sends `projectId` plus `X-Project-Key`, not `x-api-key`.
- Web apps and `packages/ui` enable `noUnusedLocals`, `noUnusedParameters`, and `erasableSyntaxOnly`; avoid TypeScript syntax that requires runtime emission.
- Follow the nearest formatter config: root and Pathlens web use single quotes/no semicolons; Airship web and `packages/ui` use double quotes/no semicolons; Pathlens API and tracker use double quotes/semicolons. Other packages inherit the root config.
- When editing `apps/airship-web`, also follow `apps/airship-web/AGENTS.md`.
