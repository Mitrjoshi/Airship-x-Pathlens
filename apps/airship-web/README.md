# React + TypeScript + Vite + shadcn/ui

This is the Airship Vite frontend. Shared shadcn components live in
`packages/ui`.

## Adding components

Add shared components from the workspace root with:

```bash
pnpm --filter @workspace/ui exec shadcn add button
```

This places the component in `packages/ui/src/components/ui` for both web apps.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@workspace/ui/components/button"
```
