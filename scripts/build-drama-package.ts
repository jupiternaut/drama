import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const packageDir = resolve(process.argv[2] ?? '.')
const packageJsonPath = join(packageDir, 'package.json')
const tsconfigPath = join(packageDir, 'tsconfig.build.json')

if (!existsSync(packageJsonPath)) {
  console.error(`Drama package build failed: package.json not found in ${packageDir}`)
  process.exit(1)
}

if (!existsSync(tsconfigPath)) {
  console.error(`Drama package build failed: tsconfig.build.json not found in ${packageDir}`)
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { name?: string }
const packageName = manifest.name ?? packageDir

rmSync(join(packageDir, 'dist'), { recursive: true, force: true })

const result = Bun.spawnSync({
  cmd: ['bun', 'x', 'tsc', '-p', 'tsconfig.build.json'],
  cwd: packageDir,
  stdout: 'inherit',
  stderr: 'inherit',
})

if (result.exitCode !== 0) {
  console.error(`Drama package build failed: ${packageName}`)
  process.exit(result.exitCode)
}

rewriteDeclarationSpecifiers(join(packageDir, 'dist', 'types'))

console.log(`Built ${packageName}`)

function rewriteDeclarationSpecifiers(root: string): void {
  if (!existsSync(root)) return

  const stack = [root]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue

    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(fullPath)
        continue
      }
      if (!entry.isFile() || !entry.name.endsWith('.d.ts')) continue
      const text = readFileSync(fullPath, 'utf8')
      const next = text
        .replace(/((?:from|import)\s*\(?\s*['"])(\.[^'"]+)\.tsx?(['"]\)?)/g, '$1$2.js$3')
        .replace(/((?:from|import)\s*\(?\s*['"])(\.[^'"]+)\.jsx?(['"]\)?)/g, '$1$2.js$3')
      if (next !== text) writeFileSync(fullPath, next)
    }
  }
}
