import 'dotenv/config'

import { Pool, type PoolClient, type QueryResultRow } from 'pg'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

export const pool = new Pool({
  connectionString: databaseUrl,
})

export interface SnapshotJob {
  projectId: string
  workspaceId: string
  sourceDomain: string | null
  status: string
  storagePath: string | null
  capturedAt: Date | string | null
  requestedAt: Date | string | null
  lastAttemptAt: Date | string | null
  nextAttemptAt: Date | string | null
  lastError: string | null
  failureCount: number
}

interface SnapshotRow extends QueryResultRow {
  project_id: string
  workspace_id: string
  source_domain: string | null
  status: string
  storage_path: string | null
  captured_at: Date | string | null
  requested_at: Date | string | null
  last_attempt_at: Date | string | null
  next_attempt_at: Date | string | null
  last_error: string | null
  failure_count: number | string | null
}

const snapshotColumns = `
  project_id,
  workspace_id,
  source_domain,
  status,
  storage_path,
  captured_at,
  requested_at,
  last_attempt_at,
  next_attempt_at,
  last_error,
  failure_count
`

const qualifiedSnapshotColumns = `
  s.project_id,
  s.workspace_id,
  s.source_domain,
  s.status,
  s.storage_path,
  s.captured_at,
  s.requested_at,
  s.last_attempt_at,
  s.next_attempt_at,
  s.last_error,
  s.failure_count
`

export async function ensureSnapshotTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_snapshots (
      project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      source_domain TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      storage_path TEXT,
      captured_at TIMESTAMPTZ,
      requested_at TIMESTAMPTZ,
      last_attempt_at TIMESTAMPTZ,
      next_attempt_at TIMESTAMPTZ,
      last_error TEXT,
      failure_count INTEGER NOT NULL DEFAULT 0
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS project_snapshots_due_idx
    ON project_snapshots (status, next_attempt_at, captured_at)
  `)
}

function mapSnapshotRow(row: SnapshotRow): SnapshotJob {
  return {
    projectId: row.project_id,
    workspaceId: row.workspace_id,
    sourceDomain: row.source_domain,
    status: row.status,
    storagePath: row.storage_path,
    capturedAt: row.captured_at,
    requestedAt: row.requested_at,
    lastAttemptAt: row.last_attempt_at,
    nextAttemptAt: row.next_attempt_at,
    lastError: row.last_error,
    failureCount: Number(row.failure_count ?? 0),
  }
}

async function syncProjectSnapshots(client: PoolClient): Promise<void> {
  await client.query(`
    INSERT INTO project_snapshots (
      project_id,
      workspace_id,
      source_domain,
      status,
      requested_at,
      next_attempt_at
    )
    SELECT
      p.id,
      p.workspace_id,
      p.domain,
      CASE WHEN p.domain IS NULL THEN 'stale' ELSE 'pending' END,
      CASE WHEN p.domain IS NULL THEN NULL ELSE NOW() END,
      CASE WHEN p.domain IS NULL THEN NULL ELSE NOW() END
    FROM projects AS p
    ON CONFLICT (project_id) DO NOTHING
  `)

  await client.query(`
    UPDATE project_snapshots AS s
    SET
      workspace_id = p.workspace_id,
      source_domain = p.domain,
      status = CASE WHEN p.domain IS NULL THEN 'stale' ELSE 'pending' END,
      requested_at = CASE WHEN p.domain IS NULL THEN NULL ELSE NOW() END,
      last_attempt_at = NULL,
      next_attempt_at = CASE WHEN p.domain IS NULL THEN NULL ELSE NOW() END,
      last_error = NULL,
      failure_count = 0
    FROM projects AS p
    WHERE s.project_id = p.id
      AND (
        s.workspace_id IS DISTINCT FROM p.workspace_id
        OR s.source_domain IS DISTINCT FROM p.domain
      )
  `)
}

export async function claimNextSnapshot(): Promise<SnapshotJob | null> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await syncProjectSnapshots(client)

    const result = await client.query<SnapshotRow>(`
      SELECT ${qualifiedSnapshotColumns}
      FROM project_snapshots AS s
      INNER JOIN projects AS p ON p.id = s.project_id
      WHERE p.domain IS NOT NULL
        AND s.workspace_id IS NOT DISTINCT FROM p.workspace_id
        AND s.source_domain IS NOT DISTINCT FROM p.domain
        AND (
          s.status = 'pending'
          OR (
            s.status = 'ready'
            AND (
              s.requested_at IS NOT NULL
              OR
              s.captured_at IS NULL
              OR s.captured_at <= NOW() - INTERVAL '1 day'
            )
          )
          OR (
            s.status IN ('stale', 'failed')
            AND (
              s.next_attempt_at IS NULL
              OR s.next_attempt_at <= NOW()
            )
          )
          OR (
            s.status = 'processing'
            AND (
              s.last_attempt_at IS NULL
              OR s.last_attempt_at <= NOW() - INTERVAL '15 minutes'
            )
          )
        )
      ORDER BY
        CASE WHEN s.status = 'pending' THEN 0 ELSE 1 END,
        COALESCE(s.requested_at, s.next_attempt_at, s.captured_at, NOW())
      LIMIT 1
      FOR UPDATE OF s SKIP LOCKED
    `)

    const row = result.rows[0]

    if (!row) {
      await client.query('COMMIT')
      return null
    }

    const claimed = await client.query<SnapshotRow>(
      `
        UPDATE project_snapshots
        SET
          status = 'processing',
          last_attempt_at = NOW(),
          next_attempt_at = NULL
        WHERE project_id = $1
        RETURNING ${snapshotColumns}
      `,
      [row.project_id]
    )

    await client.query('COMMIT')

    const claimedRow = claimed.rows[0]

    return claimedRow ? mapSnapshotRow(claimedRow) : null
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}

export async function markSnapshotReady(
  job: SnapshotJob,
  storagePath: string
): Promise<boolean> {
  const result = await pool.query(
    `
      UPDATE project_snapshots
      SET
        status = 'ready',
        storage_path = $4,
        captured_at = NOW(),
        requested_at = NULL,
        last_attempt_at = NOW(),
        next_attempt_at = NULL,
        last_error = NULL,
        failure_count = 0
      WHERE project_id = $1
        AND workspace_id = $3
        AND source_domain IS NOT DISTINCT FROM $2
        AND status = 'processing'
    `,
    [job.projectId, job.sourceDomain, job.workspaceId, storagePath]
  )

  return result.rowCount === 1
}

function getErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const compactMessage = message.replace(/\s+/g, ' ').trim()

  return (compactMessage || 'Snapshot capture failed').slice(0, 2000)
}

export async function markSnapshotStale(
  job: SnapshotJob,
  error: unknown
): Promise<boolean> {
  const failureCount = Math.min(Math.max(job.failureCount, 0) + 1, 30)
  const retryDelaySeconds = Math.min(
    6 * 60 * 60,
    60 * 2 ** Math.min(failureCount - 1, 12)
  )

  const result = await pool.query(
    `
      UPDATE project_snapshots
      SET
        status = 'stale',
        storage_path = project_snapshots.storage_path,
        captured_at = project_snapshots.captured_at,
        last_attempt_at = COALESCE(project_snapshots.last_attempt_at, NOW()),
        next_attempt_at = NOW() + ($6::double precision * INTERVAL '1 second'),
        last_error = $4,
        failure_count = $5
      WHERE project_id = $1
        AND workspace_id = $3
        AND source_domain IS NOT DISTINCT FROM $2
        AND status = 'processing'
    `,
    [
      job.projectId,
      job.sourceDomain,
      job.workspaceId,
      getErrorMessage(error),
      failureCount,
      retryDelaySeconds,
    ]
  )

  return result.rowCount === 1
}

export async function closeDatabase(): Promise<void> {
  await pool.end()
}
