import { runWorker } from './index.js'

runWorker().catch((error: unknown) => {
  console.error(
    `Snapshot worker stopped: ${error instanceof Error ? error.message : String(error)}`
  )
  process.exitCode = 1
})
