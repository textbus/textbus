const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    index: path.resolve(__dirname, 'src/public-api.ts')
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
      loader: ['ts-loader']
    }]
  }
};
