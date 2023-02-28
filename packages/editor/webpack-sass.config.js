const path = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const DisableOutputWebpackPlugin = require('./disable-output-webpack-plugin')

module.exports = {
  mode: 'production',
  entry: {
    index: [path.resolve(__dirname, 'assets/index.scss'), path.resolve(__dirname, 'assets/icons/style.css')]
  },
  output: {
    path: path.resolve(__dirname, 'bundles/')
  },
  resolve: {
    alias: {
      '@tanbo/color-picker/bundles/scss/index': path.resolve(__dirname, '../../node_modules/@tanbo/color-picker/bundles/scss/index.scss'),
    }
  },
  module: {
    rules: [{
      test: /\.ts$/,
      use: ['ts-loader']
    }, {
      test: /\.s?css$/,
      use: [MiniCssExtractPlugin.loader, 'css-loader', {
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
      }, 'sass-loader']
    }, {
      test: /\.(woff2?|eot|ttf|otf|svg)(\?.*)?$/,
      type: 'asset/inline'
    }]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'textbus.min.css'
    }),
    new DisableOutputWebpackPlugin(/textbus/)
  ]
}
