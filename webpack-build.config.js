const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    index: path.resolve(__dirname, 'src/public-api.ts')
  },
  output: {
    path: path.resolve(__dirname, './package/bundles'),
    filename: 'textbus.min.js',
    libraryTarget: 'umd',
    library: 'textbus',
    umdNamedDefine: true
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [{
      test: /\.ts$/,
      loader: ['ts-loader']
    }]
  }
};
