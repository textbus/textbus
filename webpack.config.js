const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const path = require('path');
const ip = require('ip');

module.exports = {
  mode: 'development',
  devtool: 'cheap-module-source-map',
  entry: {
    index: path.resolve(__dirname, 'index.ts')
  },
  output: {
    path: path.resolve(__dirname, 'dist')
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      '@textbus/component-library-plugin': path.resolve(__dirname, './packages/component-library-plugin/src/public-api.ts'),
      '@textbus/components': path.resolve(__dirname, './packages/components/src/public-api.ts'),
      '@textbus/contextmenu-plugin': path.resolve(__dirname, './packages/contextmenu-plugin/src/public-api.ts'),
      '@textbus/core': path.resolve(__dirname, './packages/core/src/public-api.ts'),
      '@textbus/device-toggle-plugin': path.resolve(__dirname, './packages/device-toggle-plugin/src/public-api.ts'),
      '@textbus/formatters': path.resolve(__dirname, './packages/formatters/src/public-api.ts'),
      '@textbus/full-screen-plugin': path.resolve(__dirname, './packages/full-screen-plugin/src/public-api.ts'),
      '@textbus/guard-end-block-plugin': path.resolve(__dirname, './packages/guard-end-block-plugin/src/public-api.ts'),
      '@textbus/image-and-video-drag-resize-plugin': path.resolve(__dirname, './packages/image-and-video-drag-resize-plugin/src/public-api.ts'),
      '@textbus/link-jump-tip-plugin': path.resolve(__dirname, './packages/link-jump-tip-plugin/src/public-api.ts'),
      '@textbus/outlines-plugin': path.resolve(__dirname, './packages/outlines-plugin/src/public-api.ts'),
      '@textbus/paste-upload-emitter-plugin': path.resolve(__dirname, './packages/paste-upload-emitter-plugin/src/public-api.ts'),
      '@textbus/sourcecode-mode-plugin': path.resolve(__dirname, './packages/sourcecode-mode-plugin/src/public-api.ts'),
      '@textbus/table-edit-enhance-plugin': path.resolve(__dirname, './packages/table-edit-enhance-plugin/src/public-api.ts'),
      '@textbus/textbus': path.resolve(__dirname, './packages/textbus/public-api.ts'),
      '@textbus/toolbar': path.resolve(__dirname, './packages/toolbar/src/public-api.ts'),
      '@textbus/uikit': path.resolve(__dirname, './packages/uikit/src/public-api.ts')
    }
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
      test: /\.tsx?$/,
      use: ['ts-loader']
    }, {
      test: /\.s?css$/,
      use: ['style-loader', 'css-loader', {
        loader: 'postcss-loader',
        options: {
          plugins() {
            return [require('autoprefixer')];
          }
        }
      }, 'sass-loader'],
      include: [path.resolve(__dirname, 'src/assets/')]
    }, {
      test: /\.s?css$/,
      use: ['to-string-loader', 'css-loader', {
        loader: 'postcss-loader',
        options: {
          plugins() {
            return [require('autoprefixer')];
          }
        }
      }, 'sass-loader'],
      include: [path.resolve(__dirname, 'src/lib/')]
    }, {
      test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
      use: [{
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: path.posix.join('static/', `img/[name][hash].[ext]`)
        }
      }],
    }, {
      test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
      use: [{
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: path.posix.join('static/', `fonts/[name][hash].[ext]`)
        }
      }],
    }]
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin({
      template: 'index.html'
    })
  ]
};
