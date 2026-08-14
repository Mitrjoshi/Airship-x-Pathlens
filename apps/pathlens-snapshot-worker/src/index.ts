import { pathToFileURL } from 'node:url'

import { chromium, type Browser } from 'playwright'

import {
  claimNextSnapshot,
  closeDatabase,
  ensureSnapshotTable,
  markSnapshotReady,
  markSnapshotStale,
  type SnapshotJob,
} from './db.js'
import { normalizeProjectDomain } from './security.js'
import { captureProjectScreenshot } from './screenshot.js'
import {
  createSnapshotStorage,
  defaultSnapshotStoragePath,
  type SnapshotStorage,
} from './storage.js'

const defaultPollIntervalMs = 30_000
const defaultSettleDelayMs = 750

function readDuration(name: string, fallback: number, maximum: number): number {
  const rawValue = process.env[name]

  if (rawValue === undefined) return fallback

  const value = Number(rawValue)

  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}`)
  }

  return value
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function processSnapshot(
  browser: Browser,
  storage: SnapshotStorage,
  job: SnapshotJob,
  settleDelayMs: number
): Promise<void> {
  try {
    const targetUrl = await normalizeProjectDomain(job.sourceDomain ?? '')
    const image = await captureProjectScreenshot(
      browser,
      targetUrl,
      settleDelayMs
    )
    const storagePath =
      job.storagePath?.trim() ||
      defaultSnapshotStoragePath(job.workspaceId, job.projectId)

    await storage.upload(storagePath, image)

    const committed = await markSnapshotReady(job, storagePath)

    if (!committed) {
      console.warn(
        `Snapshot result was superseded before commit for project ${job.projectId}`
      )
      return
    }

    console.info(`Captured snapshot for project ${job.projectId}`)
  } catch (error) {
    try {
      const markedStale = await markSnapshotStale(job, error)

      if (!markedStale) {
        console.warn(
          `Snapshot failure was superseded before commit for project ${job.projectId}`
        )
      } else {
        console.error(
          `Snapshot failed for project ${job.projectId}: ${errorMessage(error)}`
        )
      }
    } catch (updateError) {
      console.error(
        `Snapshot failed for project ${job.projectId}; status update failed: ${errorMessage(
          updateError
        )}`
      )
    }
  }
}

export async function runWorker(): Promise<void> {
  const pollIntervalMs = readDuration(
    'SNAPSHOT_POLL_INTERVAL_MS',
    defaultPollIntervalMs,
    60 * 60 * 1000
  )
  const settleDelayMs = readDuration(
    'SNAPSHOT_SETTLE_DELAY_MS',
    defaultSettleDelayMs,
    30 * 1000
  )

  await ensureSnapshotTable()

  const storage = createSnapshotStorage()
  await storage.assertPrivateBucket()

  const browser = await chromium.launch({ headless: true })
  let stopping = false
  const requestStop = (): void => {
    stopping = true
  }

  process.once('SIGINT', requestStop)
  process.once('SIGTERM', requestStop)

  console.info('PathLens snapshot worker started')

  try {
    while (!stopping) {
      let job: SnapshotJob | null

      try {
        job = await claimNextSnapshot()
      } catch (error) {
        console.error(`Snapshot polling failed: ${errorMessage(error)}`)
        await sleep(pollIntervalMs)
        continue
      }

      if (!job) {
        await sleep(pollIntervalMs)
        continue
      }

      await processSnapshot(browser, storage, job, settleDelayMs)
    }
  } finally {
    process.off('SIGINT', requestStop)
    process.off('SIGTERM', requestStop)
    await browser.close()
    await closeDatabase()
  }
}

function isMainModule(): boolean {
  const entrypoint = process.argv[1]

  return (
    entrypoint !== undefined &&
    pathToFileURL(entrypoint).href === import.meta.url
  )
}

if (isMainModule()) {
  runWorker().catch((error: unknown) => {
    console.error(`Snapshot worker stopped: ${errorMessage(error)}`)
    process.exitCode = 1
  })
}
