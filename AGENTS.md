# Agent Guide

## Workspace

- This is a pnpm 10 workspace (`apps/*`, `packages/*`) managed by Turborepo. Run `pnpm install` at the root; use `pnpm --filter <package> <script>` for focused work.
- App package names are `@pathlens/web`, `@airship/web`, `@pathlens/api`, `@airship/api`, and `@pathlens/tracker`; shared packages are `@workspace/ui`, `@workspace/contracts`, and `@workspace/backend-types`.
- Keep product UI and behavior in its owning app. Put shared shadcn primitives in `packages/ui`, browser-safe schemas in `packages/contracts`, and server-only types in `packages/backend-types`; declare workspace dependencies as `workspace:*`.
- Import shared UI from `@workspace/ui/components/*`; add new shadcn primitives to `packages/ui`, not an app.

## Commands

- `pnpm dev` starts all declared dev tasks in parallel. `pnpm verify` runs Turborepo `lint`, `typecheck`, and `build`; `pnpm format` and `pnpm format:check` run Prettier.
- Only the two web packages have `lint` scripts; no test script or framework is configured. For focused checks, use declared scripts such as `pnpm --filter @pathlens/web lint`, `pnpm --filter @pathlens/api typecheck`, or `pnpm --filter @pathlens/tracker build`.
- Add shared shadcn components from the root with `pnpm --filter @workspace/ui exec shadcn add <component>`; generated primitives belong in `packages/ui/src/components/ui`.
- After editing `apps/pathlens-api/src/db/schema.ts`, run `pnpm --filter @pathlens/api generate` and then `pnpm --filter @pathlens/api migrate`; use `push` only for intentional direct synchronization and `studio` for Drizzle Studio.

## Runtime Boundaries

- `apps/pathlens-api/src/index.ts` mounts the Express/PostgreSQL API under `/api` on fixed port `8080`; `apps/airship-api/src/index.ts` currently exposes only `/health` and uses `PORT` or `8081`.
- Preserve Pathlens route order: `/events` is mounted before the global `ApiKeyMiddleware`. `POST /api/events` validates each event's `projectId` as a project API key; later route groups require the internal `x-api-key`, while protected handlers may additionally require Bearer JWT and workspace permissions.
- Pathlens API `dev`/`start` load `apps/pathlens-api/.env` with `tsx --env-file=.env`; Drizzle config and the DB client also load dotenv. Provide `DATABASE_URL` for reachable PostgreSQL plus `JWT_SECRET` and `INTERNAL_API_SECRET`. Pathlens web requires `VITE_API_BASE_URL` and `VITE_API_KEY` in its Vite environment.
- The README's `.env.example` setup step is stale because no examples are checked in; create local ignored env files and never commit their values.
- Pathlens web sends `VITE_API_KEY` as `x-api-key` and stores its bearer token under `pathlens-token` in localStorage; preserve that key when changing auth flows.
- Both web apps use file-based TanStack Router routes under `src/routes`; the Vite plugin regenerates `src/routeTree.gen.ts`.
- Tracker source is `apps/pathlens-tracker/src`; tsup builds `src/index.ts` as the minified IIFE `dist/tracker.global.js`. It requires `data-project-id` (the project API key), defaults to `http://localhost:8080/api/events`, and batches events before posting. It sends the key in each event's `projectId`, not as `x-api-key`.

## Generated Files And Style

- Do not edit `dist/**`, `apps/*/src/routeTree.gen.ts`, or `apps/pathlens-api/drizzle/meta/**`. Generate migrations into `apps/pathlens-api/drizzle/` from the schema; Drizzle output is excluded from Prettier.
- Web TypeScript configs enforce `noUnusedLocals`, `noUnusedParameters`, and `erasableSyntaxOnly`; avoid syntax that requires TypeScript runtime emission.
- Follow the nearest `.prettierrc`: root/pathlens-web/airship-api/contracts/backend-types use single quotes without semicolons; airship-web/ui use double quotes without semicolons; pathlens-api/tracker use double quotes with semicolons. Do not normalize styles across package boundaries.
- When editing `apps/airship-web`, also follow `apps/airship-web/AGENTS.md`.
