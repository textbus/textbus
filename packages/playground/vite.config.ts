import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '@textbus/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@textbus/platform-browser': path.resolve(__dirname, '../platform-browser/src/index.ts'),
      '@textbus/platform-node': path.resolve(__dirname, '../platform-node/src/index.ts'),
      '@textbus/collaborate': path.resolve(__dirname, '../collaborate/src/index.ts'),
      '@textbus/adapter-viewfly': path.resolve(__dirname, '../adapter-viewfly/src/index.ts'),
      '@textbus/adapter-react': path.resolve(__dirname, '../adapter-react/src/index.ts'),
      '@textbus/adapter-vue': path.resolve(__dirname, '../adapter-vue/src/index.ts')
    }
  },
  server: {
    host: true,
    port: 8888,
    open: true
  }
})
