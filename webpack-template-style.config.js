const path = require('path');
const AddAssetsWebpackPlugin = require('add-assets-webpack-plugin');
const DisableOutputWebpackPlugin = require('./disable-output-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    index: path.resolve(__dirname, 'src/libraries/lib/viewer/template-style.scss')
  },
  output: {
    path: path.resolve(__dirname, 'bundles/lib/viewer/')
  },
  optimization: {
    minimize: false
  },

  module: {
    rules: [{
      test: /\.scss$/,
      use: [{
        loader: 'file-loader',
        options: {
          name: '[name].[ext].js'
        }
      }, './template-style-loader', 'extract-loader', 'css-loader', {
        loader: 'postcss-loader',
        options: {
          plugins() {
            return [require('autoprefixer')];
          }
        }
      }, 'sass-loader']
    }]
  },
  plugins: [
    new AddAssetsWebpackPlugin({
      filePath: 'template-style.scss.d.ts',
      content: 'declare const result: string;\n' +
        'export default result;\n'
    }),
    new DisableOutputWebpackPlugin(/template/),
  ]
};
