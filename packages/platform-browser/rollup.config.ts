import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'

export default {
  input: 'src/public-api.ts',
  output: [
    {
      file: './bundles/index.js',
      format: 'cjs'
    },
    {
      file: './bundles/index.esm.js',
      format: 'esm'
    }
  ],
  plugins: [
    commonjs(),
    typescript({
      compilerOptions: {
        paths: {}
      }
    })
  ]
}
