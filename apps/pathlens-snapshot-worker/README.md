# Project Snapshot Worker

The worker captures public project domains with Playwright and stores the latest JPEG in a private Supabase Storage bucket.

Required environment variables:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional environment variables:

- `SUPABASE_STORAGE_BUCKET` (defaults to `project-snapshots`)
- `SNAPSHOT_POLL_INTERVAL_MS` (defaults to `30000`)
- `SNAPSHOT_SETTLE_DELAY_MS` (defaults to `750`)

Create the private Supabase bucket before starting the worker. Install Chromium once with `pnpm --filter @pathlens/snapshot-worker install-browser`, then run `pnpm --filter @pathlens/snapshot-worker start`.
