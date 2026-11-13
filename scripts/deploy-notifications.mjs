import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const target = 'staging'
const account = '176246209215'
const region = 'ap-south-1'
const repository = 'pathlens/api'
const registry = `${account}.dkr.ecr.${region}.amazonaws.com`
const stack = 'pathlens-notifications-staging'
const template = resolve(root, 'apps/pathlens-api/template.yaml')
const dockerfile = resolve(root, 'apps/pathlens-api/Dockerfile')
const functions = {
  dispatcher: 'pathlens-notification-staging-dispatcher',
  worker: 'pathlens-notification-staging-worker',
}
const mappingId = '454c9e71-2806-4f4f-bf32-80316b9bfa40'
const ruleName = 'pathlens-notification-staging-schedule'
const logicalFunctions = new Set([
  'NotificationDispatcherFunction',
  'NotificationWorkerFunction',
])

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
    const detail = result.stderr?.trim()
    throw new Error(
      `${command} ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`
    )
  }
  return result.stdout?.trim() ?? ''
}

function json(command, args) {
  const output = run(command, [...args, '--output', 'json'], { capture: true })
  try {
    return JSON.parse(output)
  } catch {
    throw new Error(`Expected JSON from ${command} ${args.join(' ')}`)
  }
}

function tryRun(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (result.error) throw result.error
  return result
}

function requireTool(command, args) {
  try {
    run(command, args, { capture: true })
  } catch (error) {
    throw new Error(`Required tool '${command}' is unavailable.`)
  }
}

function gitRevision() {
  return execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim()
}

function releaseTag() {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14)
  return `notifications-${gitRevision()}-${timestamp}`
}

function digestFromImageUri(imageUri) {
  const digest = imageUri?.split('@')[1]
  return /^sha256:[a-f0-9]{64}$/.test(digest ?? '') ? digest : undefined
}

function assertDigest(value, label) {
  if (!/^sha256:[a-f0-9]{64}$/.test(value ?? ''))
    throw new Error(`${label} is not an immutable sha256 digest.`)
}

function getFunction(functionName) {
  return json('aws', [
    'lambda',
    'get-function',
    '--region',
    region,
    '--function-name',
    functionName,
  ])
}

function getImageDigest(imageUri) {
  const directDigest = digestFromImageUri(imageUri)
  if (directDigest) return directDigest
  const tag = imageUri?.slice(imageUri.lastIndexOf(':') + 1)
  if (!tag || tag === imageUri) return undefined
  const response = json('aws', [
    'ecr',
    'describe-images',
    '--region',
    region,
    '--repository-name',
    repository,
    '--image-ids',
    `imageTag=${tag}`,
  ])
  return response.imageDetails?.[0]?.imageDigest
}

function getReservedConcurrency(functionName) {
  const result = tryRun('aws', [
    'lambda',
    'get-function-concurrency',
    '--region',
    region,
    '--function-name',
    functionName,
    '--output',
    'json',
  ])
  if (result.status === 0) {
    return JSON.parse(result.stdout).ReservedConcurrentExecutions ?? null
  }
  if (
    /ResourceConflict|not configured|does not have reserved/i.test(
      result.stderr ?? ''
    )
  )
    return null
  throw new Error(`Could not read concurrency for ${functionName}.`)
}

function getFunctionSnapshot(functionName) {
  const response = getFunction(functionName)
  const configuration = response.Configuration ?? {}
  const imageUri = response.Code?.ImageUri
  return {
    state: configuration.State,
    lastUpdateStatus: configuration.LastUpdateStatus,
    imageUri,
    imageDigest: getImageDigest(imageUri),
    reservedConcurrency: getReservedConcurrency(functionName),
  }
}

function getTriggersSnapshot() {
  const mapping = json('aws', [
    'lambda',
    'get-event-source-mapping',
    '--region',
    region,
    '--uuid',
    mappingId,
  ])
  const rule = json('aws', [
    'events',
    'describe-rule',
    '--region',
    region,
    '--name',
    ruleName,
  ])
  return {
    mapping: {
      state: mapping.State,
      batchSize: mapping.BatchSize,
      scalingConfig: mapping.ScalingConfig ?? null,
      functionResponseTypes: mapping.FunctionResponseTypes ?? [],
    },
    rule: {
      state: rule.State,
      scheduleExpression: rule.ScheduleExpression,
    },
  }
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function assertEqual(before, after, label) {
  if (stable(before) !== stable(after))
    throw new Error(`${label} changed during deployment.`)
}

function getQueueHealth() {
  const queueNames = [
    'pathlens-notification-staging-queue',
    'pathlens-notification-staging-dlq',
  ]
  return Object.fromEntries(
    queueNames.map((queueName) => {
      const url = run(
        'aws',
        [
          'sqs',
          'get-queue-url',
          '--region',
          region,
          '--queue-name',
          queueName,
          '--query',
          'QueueUrl',
          '--output',
          'text',
        ],
        { capture: true }
      )
      const attributes = json('aws', [
        'sqs',
        'get-queue-attributes',
        '--region',
        region,
        '--queue-url',
        url,
        '--attribute-names',
        'ApproximateNumberOfMessages',
        'ApproximateNumberOfMessagesNotVisible',
        'ApproximateNumberOfMessagesDelayed',
      ])
      return [queueName, attributes.Attributes ?? {}]
    })
  )
}

function getAlarms() {
  const response = json('aws', [
    'cloudwatch',
    'describe-alarms',
    '--region',
    region,
    '--alarm-name-prefix',
    'pathlens-notification-staging-',
  ])
  return (response.MetricAlarms ?? []).map((alarm) => ({
    name: alarm.AlarmName,
    state: alarm.StateValue,
  }))
}

function checkIdentityAndResources() {
  const identity = json('aws', [
    'sts',
    'get-caller-identity',
    '--region',
    region,
  ])
  if (identity.Account !== account)
    throw new Error(`Expected AWS account ${account}.`)

  json('aws', [
    'ecr',
    'describe-repositories',
    '--region',
    region,
    '--repository-names',
    repository,
  ])
  const stackInfo = json('aws', [
    'cloudformation',
    'describe-stacks',
    '--region',
    region,
    '--stack-name',
    stack,
  ]).Stacks?.[0]
  if (
    !stackInfo ||
    !['CREATE_COMPLETE', 'UPDATE_COMPLETE'].includes(stackInfo.StackStatus)
  )
    throw new Error(`CloudFormation stack ${stack} is not in a stable state.`)

  for (const functionName of Object.values(functions)) {
    const snapshot = getFunctionSnapshot(functionName)
    if (
      snapshot.state !== 'Active' ||
      snapshot.lastUpdateStatus !== 'Successful'
    )
      throw new Error(`${functionName} is not Active/Successful.`)
  }
  const triggers = getTriggersSnapshot()
  if (!['Enabled', 'Disabled'].includes(triggers.mapping.state))
    throw new Error(`Unexpected SQS mapping state: ${triggers.mapping.state}`)
  if (!['ENABLED', 'DISABLED'].includes(triggers.rule.state))
    throw new Error(`Unexpected EventBridge state: ${triggers.rule.state}`)
  return {
    functions: Object.fromEntries(
      Object.entries(functions).map(([kind, functionName]) => [
        kind,
        getFunctionSnapshot(functionName),
      ])
    ),
    triggers,
    queueHealth: getQueueHealth(),
    alarms: getAlarms(),
  }
}

function runValidation() {
  console.info('Validation: API typecheck')
  run('pnpm', ['--filter', '@pathlens/api', 'typecheck'])
  console.info('Validation: notification tests')
  run('pnpm', ['--filter', '@pathlens/api', 'test:notifications'])
}

function verifyEnvironment(mode) {
  run('pnpm', [
    '--filter',
    '@pathlens/api',
    'verify:notification-environment',
    '--',
    `--${mode}`,
    '--region',
    region,
    '--account',
    account,
    '--stack',
    stack,
  ])
}

function assertTagUnused(tag) {
  const result = tryRun('aws', [
    'ecr',
    'describe-images',
    '--region',
    region,
    '--repository-name',
    repository,
    '--image-ids',
    `imageTag=${tag}`,
  ])
  if (result.status === 0) throw new Error(`ECR tag ${tag} already exists.`)
  if (!/ImageNotFound|image.*not found/i.test(result.stderr ?? ''))
    throw new Error('Could not prove the release tag is unused.')
}

function buildAndPush() {
  const tag = releaseTag()
  const imageUri = `${registry}/${repository}:${tag}`
  assertTagUnused(tag)
  console.info(`Docker build: ${imageUri}`)
  run('docker', [
    'build',
    '--platform',
    'linux/amd64',
    '--provenance=false',
    '-f',
    dockerfile,
    '-t',
    imageUri,
    root,
  ])
  console.info('Docker build: verifying dispatcher and worker entrypoints')
  run('docker', [
    'run',
    '--rm',
    '--entrypoint',
    'node',
    imageUri,
    '--input-type=module',
    '-e',
    "await import('/var/task/dist/notifications/notification-dispatcher-entrypoint.js'); await import('/var/task/dist/notifications/notification-worker-entrypoint.js')",
  ])
  console.info('ECR push: authenticating')
  const password = run(
    'aws',
    ['ecr', 'get-login-password', '--region', region],
    { capture: true }
  )
  run('docker', ['login', '--username', 'AWS', '--password-stdin', registry], {
    input: `${password}\n`,
  })
  console.info('ECR push: uploading immutable release tag')
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
      `imageTag=${tag}`,
      '--query',
      'imageDetails[0].imageDigest',
      '--output',
      'text',
    ],
    { capture: true }
  )
  assertDigest(digest, 'Pushed image')
  return `${registry}/${repository}@${digest}`
}

function createAndInspectChangeSet(imageUri) {
  if (/^\s+Environment:/m.test(readFileSync(template, 'utf8')))
    throw new Error(
      'The notification template declares Lambda Environment; refusing to risk overwriting managed variables.'
    )
  const name = `notifications-${Date.now()}`
  console.info(`CloudFormation change set: creating ${name}`)
  run('aws', [
    'cloudformation',
    'create-change-set',
    '--region',
    region,
    '--stack-name',
    stack,
    '--change-set-name',
    name,
    '--change-set-type',
    'UPDATE',
    '--template-body',
    `file://${template.replaceAll('\\', '/')}`,
    '--capabilities',
    'CAPABILITY_IAM',
    'CAPABILITY_AUTO_EXPAND',
    '--parameters',
    'ParameterKey=ResourcePrefix,UsePreviousValue=true',
    `ParameterKey=ImageUri,ParameterValue=${imageUri}`,
    'ParameterKey=AlertTopicArn,UsePreviousValue=true',
    'ParameterKey=ReserveNotificationConcurrency,UsePreviousValue=true',
    'ParameterKey=EnableHeartbeatAlarm,UsePreviousValue=true',
  ])
  run('aws', [
    'cloudformation',
    'wait',
    'change-set-create-complete',
    '--region',
    region,
    '--stack-name',
    stack,
    '--change-set-name',
    name,
  ])
  const changeSet = json('aws', [
    'cloudformation',
    'describe-change-set',
    '--region',
    region,
    '--stack-name',
    stack,
    '--change-set-name',
    name,
    '--include-property-values',
  ])
  const changes = changeSet.Changes ?? []
  if (changes.length !== logicalFunctions.size)
    throw new Error('Change set contains unexpected resource changes.')
  for (const change of changes) {
    const resource = change.ResourceChange
    const details = resource?.Details ?? []
    const changedProperties = details.map((detail) => detail.Target?.Name)
    const imageOnlyProperty =
      changedProperties.length === 1 &&
      (changedProperties[0] === 'ImageUri' ||
        (changedProperties[0] === 'Code' &&
          JSON.stringify(details[0]?.AfterValue ?? '').includes(imageUri)))
    if (
      !logicalFunctions.has(resource?.LogicalResourceId) ||
      resource.Action !== 'Modify' ||
      ['True', true].includes(resource.Replacement) ||
      !imageOnlyProperty
    ) {
      throw new Error(
        `Unsafe change set entry for ${resource?.LogicalResourceId ?? 'unknown resource'}.`
      )
    }
  }
  console.info(
    'CloudFormation change set: only dispatcher/worker ImageUri changes found'
  )
  return name
}

function verifyDeployment(before, imageUri) {
  console.info('Deployment: verifying Lambda state and immutable image')
  const after = checkIdentityAndResources()
  const expectedDigest = imageUri.split('@')[1]
  for (const [kind, snapshot] of Object.entries(after.functions)) {
    if (
      snapshot.state !== 'Active' ||
      snapshot.lastUpdateStatus !== 'Successful'
    )
      throw new Error(
        `${kind} Lambda is not Active/Successful after deployment.`
      )
    if (snapshot.imageDigest !== expectedDigest)
      throw new Error(`${kind} Lambda does not use the expected image digest.`)
  }
  assertEqual(before.triggers, after.triggers, 'Notification triggers')
  for (const kind of Object.keys(before.functions)) {
    assertEqual(
      before.functions[kind].reservedConcurrency,
      after.functions[kind].reservedConcurrency,
      `${kind} reserved concurrency`
    )
  }
  verifyEnvironment('after')
  console.info(`Queue health: ${JSON.stringify(after.queueHealth)}`)
  console.info(`Notification alarms: ${JSON.stringify(after.alarms)}`)
  return after
}

function printRollback(previous) {
  const imageUri = previous.functions.dispatcher.imageUri
  const digest = previous.functions.dispatcher.imageDigest
  if (!digest) return
  console.info(
    `Rollback (manual, no records replayed): create a fresh staging change set with ImageUri=${registry}/${repository}@${digest}, review that it changes only both Lambda ImageUri values, then execute it. Do not replay or reset delivery records.`
  )
}

function main() {
  const args = process.argv.slice(2)
  const requestedTarget = args[args.indexOf('--target') + 1] ?? target
  if (requestedTarget !== target)
    throw new Error('Only the verified staging target is supported.')
  if (!existsSync(template) || !existsSync(dockerfile))
    throw new Error('Notification template or Dockerfile is missing.')
  if (args.includes('--rollback-digest'))
    throw new Error(
      'Rollback is intentionally manual; use the printed procedure after reviewing a fresh change set.'
    )

  console.info(
    'Preflight: checking tools, AWS identity, Lambdas, triggers, queues, and alarms'
  )
  requireTool('aws', ['--version'])
  requireTool('docker', ['version'])
  const before = checkIdentityAndResources()
  for (const snapshot of Object.values(before.functions)) {
    assertDigest(snapshot.imageDigest, 'Current Lambda image')
  }
  if (
    new Set(
      Object.values(before.functions).map((snapshot) => snapshot.imageDigest)
    ).size !== 1
  )
    throw new Error(
      'Dispatcher and worker do not currently use the same image digest.'
    )
  console.info(
    `Preflight: current image digest ${before.functions.dispatcher.imageDigest}`
  )
  console.info(`Preflight: triggers ${JSON.stringify(before.triggers)}`)
  console.info(`Preflight: queue health ${JSON.stringify(before.queueHealth)}`)
  console.info(`Preflight: alarms ${JSON.stringify(before.alarms)}`)
  verifyEnvironment('before')
  runValidation()
  const imageUri = buildAndPush()
  const changeSet = createAndInspectChangeSet(imageUri)
  console.info(`Deployment: executing approved change set ${changeSet}`)
  run('aws', [
    'cloudformation',
    'execute-change-set',
    '--region',
    region,
    '--stack-name',
    stack,
    '--change-set-name',
    changeSet,
  ])
  run('aws', [
    'cloudformation',
    'wait',
    'stack-update-complete',
    '--region',
    region,
    '--stack-name',
    stack,
  ])
  verifyDeployment(before, imageUri)
  printRollback(before)
  console.info(`Deployment complete: ${imageUri}`)
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
