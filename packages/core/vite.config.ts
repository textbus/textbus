import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import pkg from './package.json'

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys((pkg as any).peerDependencies || {})
]

export default defineConfig({
  build: {
    minify: false,
    lib: {
      entry: 'src/index.ts',
      name: 'TextbusCore',
      fileName: (format) => format === 'es' ? 'index.esm.js' : 'index.js',
      formats: ['es', 'cjs']
    },
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      external
    }
  },
  plugins: [
    dts({
      tsconfigPath: './tsconfig.json',
      entryRoot: 'src',
      outDir: 'dist',
      include: ['src'],
      strictOutput: true,
      rollupTypes: false,
      pathsToAliases: false,
      insertTypesEntry: false
    })
  ]
})
