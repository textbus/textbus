import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '../..')

export default defineConfig({
  root: here,
  build: {
    lib: {
      entry: path.join(here, 'viewfly-entry.ts'),
      name: 'TextbusPlaygroundViewfly',
      formats: ['es'],
      fileName: () => 'viewfly',
    },
    outDir: path.join(repoRoot, 'docs/public/tb-playground'),
    emptyOutDir: false,
    sourcemap: false,
    minify: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'viewfly.mjs',
      },
    },
  },
})
