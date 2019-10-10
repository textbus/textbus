const path = require('path');
const AddAssetsWebpackPlugin = require('add-assets-webpack-plugin');

function DisableOutputWebpackPlugin(reg) {
  this.reg = reg || {
    test() {
      return false;
    }
  };
}

DisableOutputWebpackPlugin.prototype.apply = function (compiler) {
  compiler.hooks.emit.tapAsync('DisableOutputWebpackPlugin', (compilation, callback) => {
    Object.keys(compilation.assets).forEach(asset => {
      if (!this.reg.test(asset)) {
        delete compilation.assets[asset]
      }
    });
    callback();
  });
};

module.exports = DisableOutputWebpackPlugin;


module.exports = {
  mode: 'production',
  entry: {
    index: path.resolve(__dirname, 'src/lib/lib/edit-frame/template-style.scss')
  },
  output: {
    path: path.resolve(__dirname, 'bundles/lib/edit-frame/')
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
