import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

type Rule = {
  name: string
  roots: string[]
  forbidden: RegExp[]
  message: string
}

type Violation = {
  rule: string
  file: string
  line: number
  text: string
  message: string
}

const repoRoot = process.cwd()

const dramaPackageRoots = [
  'packages/drama-core/src',
  'packages/drama-host/src',
  'packages/drama-graph/src',
  'packages/drama-graph-ui/src',
  'packages/drama-plm/src',
  'packages/drama-plm-ui/src',
  'packages/drama-crew/src',
]

const dramaPackageDirs = [
  'packages/drama-core',
  'packages/drama-host',
  'packages/drama-graph',
  'packages/drama-plm',
  'packages/drama-crew',
  'packages/drama-graph-ui',
  'packages/drama-plm-ui',
]

const uiPackageRoots = [
  'packages/drama-graph-ui/src',
  'packages/drama-plm-ui/src',
]

const electronRoots = [
  'apps/electron/src/main',
  'apps/electron/src/renderer',
  'apps/electron/src/preload',
]

const zenMainPathRoots = [
  'apps/drama-browser-shell/src',
  'apps/drama-runtime/src',
]

const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

const rules: Rule[] = [
  {
    name: 'drama-packages-do-not-import-electron-app',
    roots: dramaPackageRoots,
    forbidden: [
      /(?:from|import)\s+['"][^'"]*apps\/electron/i,
      /(?:from|import)\s+['"][^'"]*src\/(?:main|renderer|preload)/i,
      /(?:from|import)\s+['"]@\/[^'"]+['"]/,
      /window\.electronAPI/,
    ],
    message: 'Drama packages must not depend on the Electron app, preload globals, or renderer aliases.',
  },
  {
    name: 'drama-ui-packages-stay-browser-safe',
    roots: uiPackageRoots,
    forbidden: [
      /(?:from|import)\s+['"]electron['"]/,
      /(?:from|import)\s+['"]node:/,
      /(?:from|import)\s+['"](?:fs|path|child_process|worker_threads|os|net|tls|http|https|ws)['"]/,
      /(?:from|import)\s+['"]@craft-agent\/shared/,
      /(?:from|import)\s+['"]@anthropic-ai\//,
      /(?:from|import)\s+['"]@modelcontextprotocol\//,
      /\brequire\(['"](?:fs|path|child_process|worker_threads|os|net|tls|http|https|ws|electron)['"]\)/,
    ],
    message: 'Drama React UI packages must remain browser-safe and receive host capabilities through props.',
  },
  {
    name: 'electron-imports-drama-public-exports-only',
    roots: electronRoots,
    forbidden: [
      /(?:from|import)\s+['"][^'"]*packages\/drama-[^'"]+\/src/i,
      /(?:from|import)\s+['"]@drama\/[^'"]+\/src(?:\/|['"])/,
    ],
    message: 'Electron must consume Drama packages through public package exports, not package internals.',
  },
  {
    name: 'zen-main-path-does-not-import-electron',
    roots: zenMainPathRoots,
    forbidden: [
      /(?:from|import)\s+['"]electron['"]/,
      /(?:from|import)\s+['"][^'"]*apps\/electron/i,
      /window\.electronAPI/,
      /\brequire\(['"]electron['"]\)/,
    ],
    message: 'The Zen/browser main path must stay independent from Electron.',
  },
]

function isSourceFile(path: string): boolean {
  const dotIndex = path.lastIndexOf('.')
  return dotIndex >= 0 && sourceExtensions.has(path.slice(dotIndex))
}

function listFiles(root: string): string[] {
  const absoluteRoot = join(repoRoot, root)
  try {
    if (!statSync(absoluteRoot).isDirectory()) return []
  } catch {
    return []
  }

  const files: string[] = []
  const stack = [absoluteRoot]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage') continue
        stack.push(fullPath)
      } else if (entry.isFile() && isSourceFile(fullPath)) {
        files.push(fullPath)
      }
    }
  }
  return files
}

function checkRule(rule: Rule): Violation[] {
  const violations: Violation[] = []
  for (const root of rule.roots) {
    for (const file of listFiles(root)) {
      const text = readFileSync(file, 'utf8')
      const lines = text.split(/\r?\n/)
      lines.forEach((line, index) => {
        for (const forbidden of rule.forbidden) {
          if (!forbidden.test(line)) continue
          violations.push({
            rule: rule.name,
            file: relative(repoRoot, file).split(sep).join('/'),
            line: index + 1,
            text: line.trim(),
            message: rule.message,
          })
        }
      })
    }
  }
  return violations
}

function checkPackageManifests(): Violation[] {
  const violations: Violation[] = []
  for (const packageDir of dramaPackageDirs) {
    const packageJsonPath = join(repoRoot, packageDir, 'package.json')
    const tsconfigBuildPath = join(repoRoot, packageDir, 'tsconfig.build.json')
    const file = `${packageDir}/package.json`
    if (!existsSync(packageJsonPath)) {
      violations.push({
        rule: 'drama-package-manifest',
        file,
        line: 1,
        text: 'package.json missing',
        message: 'Every Drama package must have a package manifest.',
      })
      continue
    }

    const manifest = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      main?: string
      module?: string
      types?: string
      exports?: unknown
      files?: string[]
      scripts?: Record<string, string>
    }

    const requiredDistFields = [
      ['main', manifest.main],
      ['module', manifest.module],
      ['types', manifest.types],
    ] as const

    for (const [field, value] of requiredDistFields) {
      if (typeof value === 'string' && value.startsWith('./dist/')) continue
      violations.push({
        rule: 'drama-package-manifest',
        file,
        line: 1,
        text: `${field}: ${String(value)}`,
        message: 'Drama package entry fields must point at built dist output.',
      })
    }

    if (!manifest.scripts?.build) {
      violations.push({
        rule: 'drama-package-manifest',
        file,
        line: 1,
        text: 'scripts.build missing',
        message: 'Every Drama package must expose a package-local build command.',
      })
    }

    if (!manifest.files?.includes('dist')) {
      violations.push({
        rule: 'drama-package-manifest',
        file,
        line: 1,
        text: `files: ${JSON.stringify(manifest.files)}`,
        message: 'Publishable Drama package files must include dist.',
      })
    }

    if (!existsSync(tsconfigBuildPath)) {
      violations.push({
        rule: 'drama-package-manifest',
        file: `${packageDir}/tsconfig.build.json`,
        line: 1,
        text: 'tsconfig.build.json missing',
        message: 'Every Drama package must have an explicit build tsconfig.',
      })
    }

    for (const value of collectExportTargets(manifest.exports)) {
      if (!value.includes('/src/') && !value.startsWith('./src/')) continue
      violations.push({
        rule: 'drama-package-manifest',
        file,
        line: 1,
        text: value,
        message: 'Public package exports must not point at source files.',
      })
    }
  }
  return violations
}

function collectExportTargets(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (!value || typeof value !== 'object') return []
  return Object.values(value as Record<string, unknown>).flatMap(collectExportTargets)
}

const violations = [
  ...rules.flatMap(checkRule),
  ...checkPackageManifests(),
]

if (violations.length > 0) {
  console.error(`Drama boundary check failed with ${violations.length} violation(s):`)
  for (const violation of violations) {
    console.error(`\n[${violation.rule}] ${violation.file}:${violation.line}`)
    console.error(`  ${violation.text}`)
    console.error(`  ${violation.message}`)
  }
  process.exit(1)
}

console.log('Drama boundary check passed.')
