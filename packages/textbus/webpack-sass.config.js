const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const DisableOutputWebpackPlugin = require('./disable-output-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    index: path.resolve(__dirname, 'src/assets/index.scss')
  },
  output: {
    path: path.resolve(__dirname, 'bundles/')
  },
  module: {
    rules: [{
      test: /\.ts$/,
      loader: ['ts-loader']
    }, {
      test: /\.s?css$/,
      loader: [MiniCssExtractPlugin.loader, 'css-loader', {
        loader: 'postcss-loader',
        options: {
          plugins() {
            return [require('autoprefixer')];
          }
        }
      }, 'sass-loader']
    }, {
      test: /\.(woff2?|eot|ttf|otf|svg)(\?.*)?$/,
      use: [{
        loader: 'url-loader',
        options: {
          limit: 100000
        }
      }],
    }]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'textbus.min.css'
    }),
    new DisableOutputWebpackPlugin(/textbus/)
  ]
};
