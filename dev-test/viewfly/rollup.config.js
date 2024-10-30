const commonjs = require('@rollup/plugin-commonjs')
const typescript = require('rollup-plugin-typescript2')
const postcss = require('@viewfly/devtools/rollup-plugin-postcss')
const copy = require('rollup-plugin-copy')

module.exports = {
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
    typescript(),
    copy({
      targets: [{
        src: './src/assets/icons/fonts',
        dest: './bundles/'
      }]
    }),
    postcss({
      minimize: true,
      extract: true
    })
  ]
}
