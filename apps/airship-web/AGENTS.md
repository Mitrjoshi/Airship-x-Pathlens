# Airship Web Guide

## Commands

- Run `pnpm install` from the workspace root.
- Use `pnpm --filter @airship/web dev` for development, `pnpm --filter @airship/web lint` for linting, `pnpm --filter @airship/web typecheck` for TypeScript, and `pnpm --filter @airship/web build` for a production build.
- Format with the root `pnpm format`; this app retains double quotes, no semicolons, 80-column lines, and Tailwind class sorting.

## Application Structure

- This is a Vite React application. `src/main.tsx` mounts the TanStack Router inside the theme and tooltip providers; `src/router.tsx` owns the QueryClient and router context.
- Use file-based TanStack routes under `src/routes`. The Vite plugin generates `src/routeTree.gen.ts`; do not edit it.
- Shared shadcn components are in `packages/ui`; import them from `@workspace/ui/components/*`. Add new shared primitives from `packages/ui`, not under this app.
- App-specific layout, navigation, and theme behavior remain under this app. Preserve the `theme` localStorage key and the `d` keyboard shortcut in `ThemeProvider`.

## Constraints

- TypeScript is strict and rejects unused locals and parameters. It uses `erasableSyntaxOnly`, so avoid TypeScript syntax that requires runtime emission.
- No test script or test framework is configured.
