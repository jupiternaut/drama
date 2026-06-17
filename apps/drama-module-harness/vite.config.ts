import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

function fromRoot(path: string): string {
  return fileURLToPath(new URL(`../../${path}`, import.meta.url))
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@drama/core': fromRoot('packages/drama-core/src/index.ts'),
      '@drama/crew': fromRoot('packages/drama-crew/src/index.ts'),
      '@drama/graph': fromRoot('packages/drama-graph/src/index.ts'),
      '@drama/graph-ui': fromRoot('packages/drama-graph-ui/src/index.ts'),
      '@drama/host': fromRoot('packages/drama-host/src/index.ts'),
      '@drama/plm-ui': fromRoot('packages/drama-plm-ui/src/index.ts'),
    },
  },
})
