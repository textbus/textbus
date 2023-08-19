const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')
const EslintWebpackPlugin = require('eslint-webpack-plugin')
const ip = require('ip')

module.exports = {
  mode: 'development',
  devtool: 'cheap-module-source-map',
  entry: {
    index: path.resolve(__dirname, 'index.tsx')
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      '@textbus/core$': path.resolve(__dirname, './packages/core/src/public-api.ts'),
      '@textbus/platform-browser$': path.resolve(__dirname, './packages/platform-browser/src/public-api.ts'),
      '@textbus/editor$': path.resolve(__dirname, './packages/editor/src/public-api.ts'),
      '@textbus/collaborate$': path.resolve(__dirname, './packages/collaborate/src/public-api.ts'),
      '@textbus/adapter-viewfly': path.resolve(__dirname, './packages/adapter-viewfly/src/public-api.ts'),
      '@textbus/adapter-react': path.resolve(__dirname, './packages/adapter-react/src/public-api.ts'),
      '@textbus/adapter-vue': path.resolve(__dirname, './packages/adapter-vue/src/public-api.ts'),
    }
  },
  devServer: {
    host: ip.address(),
    static: {
      directory: path.join(__dirname, 'dist')
    },
    compress: true,
    port: 8888,
    hot: true,
    open: true
  },
  module: {
    rules: [{
      test: /\.tsx?$/,
      use: [{
        loader: 'ts-loader',
        options: {
          configFile: path.resolve(__dirname, './tsconfig-dev.json')
        }
      }]
    }, {
      test: /\.s?css$/,
      exclude: [path.resolve(__dirname, './packages/editor/src/components')],
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
      include: [path.resolve(__dirname, './packages/editor/src/components')],
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
  },
  plugins: [
    new EslintWebpackPlugin({
      extensions: ['.ts', '.tsx'],
      exclude: [
        './test'
      ]
    }),
    new HtmlWebpackPlugin({
      template: 'index.html'
    })
  ]
}
