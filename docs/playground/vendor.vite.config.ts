import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import swc from 'vite-plugin-swc-transform'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '../..')

export default defineConfig({
  root: here,
  plugins: [
    swc({
      swcOptions: {
        jsc: {
          parser: {
            syntax: 'typescript',
            decorators: true,
            tsx: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
            useDefineForClassFields: true,
          },
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@textbus/core': path.resolve(repoRoot, 'packages/core/src/index.ts'),
      '@textbus/platform-browser': path.resolve(repoRoot, 'packages/platform-browser/src/public-api.ts'),
      '@textbus/platform-node': path.resolve(repoRoot, 'packages/platform-node/src/public-api.ts'),
      '@textbus/adapter-viewfly': path.resolve(repoRoot, 'packages/adapter-viewfly/src/public-api.ts'),
    },
  },
  build: {
    lib: {
      entry: path.join(here, 'vendor-entry.ts'),
      name: 'TextbusPlaygroundVendor',
      formats: ['es'],
      fileName: () => 'vendor',
    },
    outDir: path.join(repoRoot, 'docs/public/playground'),
    emptyOutDir: false,
    sourcemap: false,
    minify: false,
    rollupOptions: {
      external: (id) => id.startsWith('@viewfly/'),
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'vendor.mjs',
      },
    },
  },
})
