const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')
const EslintWebpackPlugin = require('eslint-webpack-plugin')
const ip = require('ip')

module.exports = {
  mode: 'development',
  devtool: 'cheap-module-source-map',
  entry: {
    index: path.resolve(__dirname, 'index.ts')
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      '@textbus/core$': path.resolve(__dirname, './packages/core/src/public-api.ts'),
      '@textbus/core/jsx-runtime': path.resolve(__dirname, './packages/core/src/jsx-runtime'),
      '@textbus/browser$': path.resolve(__dirname, './packages/browser/src/public-api.ts'),
      '@textbus/editor$': path.resolve(__dirname, './packages/editor/src/public-api.ts'),
      '@textbus/collaborate$': path.resolve(__dirname, './packages/collaborate/src/public-api.ts'),
      '@tanbo/color-picker/bundles/scss/index': path.resolve(__dirname, './node_modules/@tanbo/color-picker/bundles/scss/index.scss'),
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
      use: ['ts-loader']
    }, {
      test: /\.s?css$/,
      use: ['style-loader', 'css-loader', {
        loader: 'postcss-loader',
        options: {
          postcssOptions: {
            plugins: [
              [
                "postcss-preset-env",
                {
                  // Options
                },
              ],
              [
                "autoprefixer"
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
