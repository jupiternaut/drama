import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const dramaPackages = [
  'packages/drama-core',
  'packages/drama-host',
  'packages/drama-ui',
  'packages/drama-graph',
  'packages/drama-plm',
  'packages/drama-crew',
  'packages/drama-graph-ui',
  'packages/drama-plm-ui',
]

for (const packagePath of dramaPackages) {
  const result = spawnSync('bun', ['run', '../../scripts/build-drama-package.ts', '.'], {
    cwd: join(process.cwd(), packagePath),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
