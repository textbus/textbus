const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    index: path.resolve(__dirname, 'src/index.ts')
  },
  output: {
    path: path.resolve(__dirname, 'dist')
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  devServer: {
    host: 'localhost',
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 9000,
    hot: true,
    open: true
  },
  module: {
    rules: [{
      test: /\.ts$/,
      loader: ['ts-loader']
    }, {
      test: /\.scss$/,
      loader: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader']
    }]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'src/index.html'
    })
  ]
};
