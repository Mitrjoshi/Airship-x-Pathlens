import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
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

function argument(name) {
  const index = process.argv.indexOf(name)
  const value = process.argv[index + 1]
  if (index < 0 || !value) throw new Error(`Missing required argument ${name}.`)
  return value
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
  const dockerfile = resolve(root, argument('--dockerfile'))
  const repository = argument('--repository')
  const functionName = argument('--function')
  const region = process.env.AWS_REGION || 'ap-south-1'
  if (!existsSync(dockerfile)) throw new Error(`Missing ${dockerfile}`)

  run('docker', ['version'])
  run('aws', ['--version'])

  const accountId = run(
    'aws',
    ['sts', 'get-caller-identity', '--query', 'Account', '--output', 'text'],
    { capture: true }
  )
  if (!/^\d{12}$/.test(accountId))
    throw new Error('AWS account identity could not be resolved.')

  const registry = `${accountId}.dkr.ecr.${region}.amazonaws.com`
  const imageTag = `${gitTag()}-${Date.now()}`
  const mutableBuildUri = `${registry}/${repository}:${imageTag}`

  run('docker', [
    'build',
    '--platform',
    imagePlatform,
    '--provenance=false',
    '-f',
    dockerfile,
    '-t',
    mutableBuildUri,
    root,
  ])
  run('aws', [
    'ecr',
    'describe-repositories',
    '--region',
    region,
    '--repository-names',
    repository,
  ])
  const password = run(
    'aws',
    ['ecr', 'get-login-password', '--region', region],
    { capture: true }
  )
  run('docker', ['login', '--username', 'AWS', '--password-stdin', registry], {
    input: `${password}\n`,
  })
  run('docker', ['push', mutableBuildUri])

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
    '--function-name',
    functionName,
    '--image-uri',
    immutableImageUri,
    '--region',
    region,
  ])
  console.info(`Deployed ${functionName} using ${immutableImageUri}`)
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
