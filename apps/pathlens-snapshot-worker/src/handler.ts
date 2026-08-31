import type { SQSEvent, SQSBatchResponse, SQSRecord } from 'aws-lambda'
import { claimSnapshot, ensureSnapshotTable } from './db.js'
import { launchBrowser } from './browser.js'
import { processSnapshot } from './index.js'
import { createSnapshotStorage } from './storage.js'

interface SnapshotMessage {
  projectId: string
}

function parseMessage(record: SQSRecord): SnapshotMessage {
  const value: unknown = JSON.parse(record.body)

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

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  await ensureSnapshotTable()
  const storage = createSnapshotStorage()
  await storage.assertPrivateBucket()
  const browser = await launchBrowser()
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = []

  try {
    for (const record of event.Records) {
      try {
        const message = parseMessage(record)
        const job = await claimSnapshot(message.projectId)

        if (job) {
          await processSnapshot(
            browser,
            storage,
            job,
            Number(process.env.SNAPSHOT_SETTLE_DELAY_MS ?? 750)
          )
        }
      } catch (error) {
        console.error(`Snapshot SQS record failed: ${String(error)}`)
        batchItemFailures.push({ itemIdentifier: record.messageId })
      }
    }
  } finally {
    await browser.close()
  }

  return { batchItemFailures }
}
