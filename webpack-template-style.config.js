const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'production',
  entry: {
    index: path.resolve(__dirname, 'src/lib/lib/edit-frame/template-html.ts')
  },
  output: {
    path: path.resolve(__dirname, 'bundles/lib/edit-frame/'),
    filename: "template-html.js",
    libraryTarget: 'umd'
  },
  optimization: {
    minimize: false
  },

  module: {
    rules: [{
      test: /\.ts$/,
      use: ['ts-loader']
    }]
  }
};
