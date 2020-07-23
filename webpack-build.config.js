const path = require('path');
const version = require('./package.json').version;

module.exports = {
  mode: 'production',
  entry: {
    index: path.resolve(__dirname, 'src/lib/public-api.ts')
  },
  output: {
    path: path.resolve(__dirname, './package/bundles'),
    filename: 'tbus-' + version + '.js',
    libraryTarget: 'umd',
    library: 'tbus',
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
