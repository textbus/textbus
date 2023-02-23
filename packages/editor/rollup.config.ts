import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import postcss from 'rollup-plugin-postcss'

export default {
  input: './src/public-api.ts',
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
    postcss({
      use: ['sass']
    }),
    typescript({
      compilerOptions: {
        paths: {}
      }
    })
  ]
}
