import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

function fromRoot(path: string): string {
  return fileURLToPath(new URL(`../../${path}`, import.meta.url))
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 3197,
  },
  resolve: {
    alias: {
      '@drama/core': fromRoot('packages/drama-core/src/index.ts'),
      '@drama/crew': fromRoot('packages/drama-crew/src/index.ts'),
      '@drama/graph': fromRoot('packages/drama-graph/src/index.ts'),
      '@drama/graph-ui': fromRoot('packages/drama-graph-ui/src/index.ts'),
      '@drama/host/gecko': fromRoot('packages/drama-host/src/gecko.ts'),
      '@drama/host': fromRoot('packages/drama-host/src/index.ts'),
      '@drama/plm-ui': fromRoot('packages/drama-plm-ui/src/index.ts'),
      '@drama/ui/styles.css': fromRoot('packages/drama-ui/src/styles.css'),
      '@drama/ui': fromRoot('packages/drama-ui/src/index.ts'),
    },
  },
})
