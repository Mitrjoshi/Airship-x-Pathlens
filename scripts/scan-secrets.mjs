import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const placeholderPattern =
  /^(?:$|changeme|change-me|replace[-_ ]?me|example|placeholder|your[-_ ]|<.*>|\$\{.*\})$/i

const assignmentPattern =
  /\b([A-Z][A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY|ACCESS_KEY)[A-Z0-9_]*)[ \t]*[:=][ \t]*["']?([^"'#\r\n]+)["']?/g

const highConfidencePatterns = [
  { name: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'private key', pattern: /-----BEGIN [A-Z ]+ PRIVATE KEY-----/g },
  {
    name: 'GitHub token',
    pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
  },
]

function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
}

function lineNumber(text, index) {
  return text.slice(0, index).split('\n').length
}

function scanFile(relativePath) {
  const absolutePath = resolve(root, relativePath)
  let text
  try {
    text = readFileSync(absolutePath, 'utf8')
  } catch {
    return []
  }

  const findings = []
  if (basename(relativePath).startsWith('.env')) {
    for (const match of text.matchAll(assignmentPattern)) {
      const value = match[2].trim()
      if (
        !value ||
        placeholderPattern.test(value) ||
        /^(?:true|false)$/i.test(value)
      )
        continue
      findings.push({
        file: relativePath,
        line: lineNumber(text, match.index ?? 0),
        rule: `non-empty ${match[1]} assignment`,
      })
    }
  }

  for (const { name, pattern } of highConfidencePatterns) {
    for (const match of text.matchAll(pattern)) {
      findings.push({
        file: relativePath,
        line: lineNumber(text, match.index ?? 0),
        rule: name,
      })
    }
  }
  return findings
}

const findings = trackedFiles().flatMap(scanFile)

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line}: ${finding.rule}`)
  }
  console.error(`Secret scan failed with ${findings.length} finding(s).`)
  process.exitCode = 1
} else {
  console.info('Secret scan passed: no high-confidence tracked-file findings.')
}
