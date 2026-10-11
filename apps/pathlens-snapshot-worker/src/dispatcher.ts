import { SendMessageBatchCommand, SQSClient } from '@aws-sdk/client-sqs'
import type { ScheduledHandler } from 'aws-lambda'

import {
  ensureSnapshotTable,
  queueDueHeatmapSnapshotIds,
  queueDueSnapshotProjectIds,
} from './db.js'

const sqs = new SQSClient({})

export const handler: ScheduledHandler = async () => {
  const queueUrl = process.env.SNAPSHOT_QUEUE_URL?.trim()

  if (!queueUrl) throw new Error('SNAPSHOT_QUEUE_URL is required')

  await ensureSnapshotTable()
  const projectIds = await queueDueSnapshotProjectIds()
  const heatmapSnapshotIds = await queueDueHeatmapSnapshotIds()
  const entriesToSend = [
    ...projectIds.map((projectId) => ({ type: 'project', projectId })),
    ...heatmapSnapshotIds.map((snapshotId) => ({
      type: 'heatmap-page',
      snapshotId,
    })),
  ]

  for (let offset = 0; offset < entriesToSend.length; offset += 10) {
    const entries = entriesToSend
      .slice(offset, offset + 10)
      .map((message, index) => ({
        Id: `${offset + index}`,
        MessageBody: JSON.stringify(message),
      }))
    const result = await sqs.send(
      new SendMessageBatchCommand({ QueueUrl: queueUrl, Entries: entries })
    )

    if (result.Failed?.length) {
      throw new Error(`Failed to enqueue ${result.Failed.length} snapshot jobs`)
    }
  }
}
