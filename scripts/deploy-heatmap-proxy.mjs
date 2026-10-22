import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const region = process.env.AWS_REGION || 'ap-south-1'
const functionName =
  process.env.LAMBDA_FUNCTION_NAME || 'pathlens-heatmap-proxy'
const repository = process.env.ECR_REPOSITORY || 'pathlens/heatmap-proxy'
const imagePlatform = 'linux/amd64'

function run(command, args, options = {}) {
  const { capture = false, input, ...spawnOptions } = options
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: capture
      ? ['ignore', 'pipe', 'pipe']
      : input !== undefined
        ? ['pipe', 'inherit', 'inherit']
        : 'inherit',
    input,
    ...spawnOptions,
  })

  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed with exit code ${result.status}`
    )
  }

  return result.stdout?.trim() ?? ''
}

function requireTool(command, args) {
  try {
    run(command, args, { capture: true })
  } catch (error) {
    throw new Error(
      `Required tool '${command}' is unavailable: ${error.message}`
    )
  }
}

function gitTag() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
    }).trim()
  } catch {
    return 'local'
  }
}

function main() {
  const dockerfile = resolve(root, 'apps/pathlens-heatmap-proxy/Dockerfile')
  if (!existsSync(dockerfile)) throw new Error(`Missing ${dockerfile}`)

  requireTool('docker', ['version'])
  requireTool('aws', ['--version'])

  const accountId = run(
    'aws',
    ['sts', 'get-caller-identity', '--query', 'Account', '--output', 'text'],
    { capture: true }
  )
  if (!/^\d{12}$/.test(accountId))
    throw new Error('AWS account identity could not be resolved.')

  const registry = `${accountId}.dkr.ecr.${region}.amazonaws.com`
  const imageTag = `${gitTag()}-${Date.now()}`
  const imageUri = `${registry}/${repository}:${imageTag}`

  run('docker', [
    'build',
    '--platform',
    imagePlatform,
    '--provenance=false',
    '-f',
    dockerfile,
    '-t',
    imageUri,
    root,
  ])
  run('docker', [
    'run',
    '--rm',
    '--entrypoint',
    'node',
    imageUri,
    '--input-type=module',
    '-e',
    "import('/var/task/dist/handler.js').then((module) => { if (typeof module.handler !== 'function') process.exit(1) })",
  ])

  run('aws', [
    'ecr',
    'describe-repositories',
    '--region',
    region,
    '--repository-names',
    repository,
  ])
  run('aws', [
    'lambda',
    'get-function',
    '--region',
    region,
    '--function-name',
    functionName,
  ])

  const password = run(
    'aws',
    ['ecr', 'get-login-password', '--region', region],
    { capture: true }
  )
  run('docker', ['login', '--username', 'AWS', '--password-stdin', registry], {
    input: `${password}\n`,
  })

  run('docker', ['push', imageUri])

  const digest = run(
    'aws',
    [
      'ecr',
      'describe-images',
      '--region',
      region,
      '--repository-name',
      repository,
      '--image-ids',
      `imageTag=${imageTag}`,
      '--query',
      'imageDetails[0].imageDigest',
      '--output',
      'text',
    ],
    { capture: true }
  )

  if (!/^sha256:[a-f0-9]{64}$/.test(digest))
    throw new Error('ECR image digest could not be resolved.')

  const immutableImageUri = `${registry}/${repository}@${digest}`
  run('aws', [
    'lambda',
    'update-function-code',
    '--region',
    region,
    '--function-name',
    functionName,
    '--image-uri',
    immutableImageUri,
    '--publish',
  ])
  run('aws', [
    'lambda',
    'wait',
    'function-updated-v2',
    '--region',
    region,
    '--function-name',
    functionName,
  ])

  console.info(`Heatmap proxy deployed to ${functionName}`)
  console.info(`Image: ${immutableImageUri}`)
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
