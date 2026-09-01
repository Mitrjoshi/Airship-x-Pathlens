import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs'

import { ensureSnapshotTable } from './db.js'
import { launchBrowser } from './browser.js'
import { parseSnapshotMessage, processSnapshotMessage } from './message.js'
import { createSnapshotStorage } from './storage.js'

const queueUrl = process.env.SNAPSHOT_QUEUE_URL?.trim()
const endpoint = process.env.SNAPSHOT_SQS_ENDPOINT?.trim()

if (!queueUrl) throw new Error('SNAPSHOT_QUEUE_URL is required')

const sqs = new SQSClient({
  region: process.env.AWS_REGION ?? 'ap-south-1',
  ...(endpoint
    ? {
        endpoint,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      }
    : {}),
})

async function runLocalConsumer(): Promise<void> {
  await ensureSnapshotTable()
  const storage = createSnapshotStorage()
  await storage.assertPrivateBucket()
  const browser = await launchBrowser()

  try {
    console.info('PathLens local snapshot SQS consumer started')

    while (true) {
      const result = await sqs.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 5,
          WaitTimeSeconds: 20,
          VisibilityTimeout: 120,
        })
      )

      for (const message of result.Messages ?? []) {
        if (!message.Body || !message.ReceiptHandle) continue

        try {
          await processSnapshotMessage(
            parseSnapshotMessage(message.Body),
            browser,
            storage
          )
          await sqs.send(
            new DeleteMessageCommand({
              QueueUrl: queueUrl,
              ReceiptHandle: message.ReceiptHandle,
            })
          )
        } catch (error) {
          console.error(`Local snapshot SQS message failed: ${String(error)}`)
        }
      }
    }
  } finally {
    await browser.close()
  }
}

runLocalConsumer().catch((error: unknown) => {
  console.error(
    `Snapshot worker stopped: ${error instanceof Error ? error.message : String(error)}`
  )
  process.exitCode = 1
})
