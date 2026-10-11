import type { Browser } from 'playwright-core'

import { claimHeatmapSnapshot, claimSnapshot } from './db.js'
import { processHeatmapSnapshot, processSnapshot } from './index.js'
import type { SnapshotStorage } from './storage.js'

export interface SnapshotMessage {
  type?: 'project' | 'heatmap-page'
  projectId?: string
  snapshotId?: string
}

export function parseSnapshotMessage(body: string): SnapshotMessage {
  const value: unknown = JSON.parse(body)

  if (!value || typeof value !== 'object') {
    throw new Error('SQS message must contain a non-empty projectId')
  }

  const message = value as SnapshotMessage
  if (message.type === 'heatmap-page' && message.snapshotId?.trim()) {
    return { type: 'heatmap-page', snapshotId: message.snapshotId.trim() }
  }

  if (typeof message.projectId === 'string' && message.projectId.trim()) {
    return { type: 'project', projectId: message.projectId.trim() }
  }

  throw new Error('SQS message must contain a projectId or snapshotId')
}

export async function processSnapshotMessage(
  message: SnapshotMessage,
  browser: Browser,
  storage: SnapshotStorage
): Promise<void> {
  if (message.type === 'heatmap-page' && message.snapshotId) {
    const job = await claimHeatmapSnapshot(message.snapshotId)
    if (job) {
      await processHeatmapSnapshot(browser, storage, job)
    }
    return
  }

  if (message.projectId) {
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
}
