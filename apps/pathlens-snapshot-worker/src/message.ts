import type { Browser } from 'playwright-core'

import { claimSnapshot } from './db.js'
import { processSnapshot } from './index.js'
import type { SnapshotStorage } from './storage.js'

export interface SnapshotMessage {
  projectId: string
}

export function parseSnapshotMessage(body: string): SnapshotMessage {
  const value: unknown = JSON.parse(body)

  if (
    !value ||
    typeof value !== 'object' ||
    typeof (value as { projectId?: unknown }).projectId !== 'string' ||
    !(value as { projectId: string }).projectId.trim()
  ) {
    throw new Error('SQS message must contain a non-empty projectId')
  }

  return { projectId: (value as { projectId: string }).projectId.trim() }
}

export async function processSnapshotMessage(
  message: SnapshotMessage,
  browser: Browser,
  storage: SnapshotStorage
): Promise<void> {
  const job = await claimSnapshot(message.projectId)

  if (job) {
    await processSnapshot(
      browser,
      storage,
      job,
      Number(process.env.SNAPSHOT_SETTLE_DELAY_MS ?? 750)
    )
  }
}
