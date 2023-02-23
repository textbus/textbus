const path = require('path')

module.exports = {
  mode: 'production',
  entry: {
    index: path.resolve(__dirname, 'src/namespace.ts')
  },
  output: {
    path: path.resolve(__dirname, './bundles'),
    filename: 'textbus.min.js',
    libraryTarget: 'umd',
    library: 'textbus',
    umdNamedDefine: true
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
    rules: [{
      test: /\.tsx?$/,
      use: [{
        loader: 'ts-loader',
        options: {
          compilerOptions: {
            declaration: false
          }
        }
      }]
    }, {
      test: /\.s?css$/,
      exclude: [path.resolve(__dirname, './src/components')],
      use: ['style-loader', 'css-loader', {
        loader: 'postcss-loader',
        options: {
          postcssOptions: {
            plugins: [
              [
                'postcss-preset-env',
                {
                  // Options
                },
              ],
              [
                'autoprefixer'
              ]
            ],
          }
        }
      }, 'sass-loader'],
    }, {
      test: /\.s?css$/,
      include: [path.resolve(__dirname, './src/components')],
      use: ['to-string-loader', 'css-loader', {
        loader: 'postcss-loader',
        options: {
          postcssOptions: {
            plugins: [
              [
                'postcss-preset-env',
                {
                  // Options
                },
              ],
              [
                'autoprefixer'
              ]
            ],
          }
        }
      }, 'sass-loader'],
    }]
  }
}
