import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const packageName = process.argv[2]

if (!packageName) {
  console.error('Usage: node scripts/build-lambda-layer.mjs <package-name>')
  process.exit(1)
}

const safeName = packageName.replace(/^@/, '').replace(/\//g, '-')

const root = process.cwd()

const tempDir = path.join(root, 'lambda-layers', '.tmp', safeName)

const layerDir = path.join(root, 'lambda-layers', safeName)

const nodejsDir = path.join(layerDir, 'nodejs')

fs.rmSync(tempDir, {
  recursive: true,
  force: true,
})

fs.rmSync(layerDir, {
  recursive: true,
  force: true,
})

fs.mkdirSync(tempDir, {
  recursive: true,
})

fs.mkdirSync(nodejsDir, {
  recursive: true,
})

console.log(`Building Lambda layer for ${packageName}`)

/*
 * Deploy the selected workspace package and all production dependencies.
 * pnpm understands workspace:* dependencies here.
 */
execSync(
  `pnpm --filter "${packageName}" --config.node-linker=hoisted deploy --legacy --prod "${tempDir}"`,
  {
    stdio: 'inherit',
    cwd: root,
  }
)

/*
 * Lambda only needs node_modules from the deployed package.
 */
const deployedNodeModules = path.join(tempDir, 'node_modules')
const targetNodeModules = path.join(nodejsDir, 'node_modules')

if (!fs.existsSync(deployedNodeModules)) {
  throw new Error(`node_modules was not created for ${packageName}`)
}

fs.cpSync(deployedNodeModules, targetNodeModules, {
  recursive: true,
  dereference: true,
})

console.log('')
console.log('Lambda layer created:')
console.log(layerDir)
console.log('')
console.log('Expected structure:')
console.log('nodejs/node_modules/')
