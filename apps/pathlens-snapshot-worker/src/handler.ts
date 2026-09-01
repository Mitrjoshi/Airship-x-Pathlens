import type { SQSEvent, SQSBatchResponse } from 'aws-lambda'
import { ensureSnapshotTable } from './db.js'
import { launchBrowser } from './browser.js'
import { parseSnapshotMessage, processSnapshotMessage } from './message.js'
import { createSnapshotStorage } from './storage.js'

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  await ensureSnapshotTable()
  const storage = createSnapshotStorage()
  await storage.assertPrivateBucket()
  const browser = await launchBrowser()
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = []

  try {
    for (const record of event.Records) {
      try {
        await processSnapshotMessage(
          parseSnapshotMessage(record.body),
          browser,
          storage
        )
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
