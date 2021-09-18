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
      '@textbus/textbus': path.resolve(__dirname, './src/public-api.ts'),
      '@textbus/component-library-plugin': path.resolve(__dirname, '../component-library-plugin/src/public-api.ts'),
      '@textbus/components': path.resolve(__dirname, '../components/src/public-api.ts'),
      '@textbus/contextmenu-plugin': path.resolve(__dirname, '../contextmenu-plugin/src/public-api.ts'),
      '@textbus/core': path.resolve(__dirname, '../core/src/public-api.ts'),
      '@textbus/device-toggle-plugin': path.resolve(__dirname, '../device-toggle-plugin/src/public-api.ts'),
      '@textbus/formatters': path.resolve(__dirname, '../formatters/src/public-api.ts'),
      '@textbus/full-screen-plugin': path.resolve(__dirname, '../full-screen-plugin/src/public-api.ts'),
      '@textbus/guard-end-block-plugin': path.resolve(__dirname, '../guard-end-block-plugin/src/public-api.ts'),
      '@textbus/image-adn-video-drag-resize-plugin': path.resolve(__dirname, '../image-adn-video-drag-resize-plugin/src/public-api.ts'),
      '@textbus/link-jump-tip-plugin': path.resolve(__dirname, '../link-jump-tip-plugin/src/public-api.ts'),
      '@textbus/outlines-plugin': path.resolve(__dirname, '../outlines-plugin/src/public-api.ts'),
      '@textbus/paste-upload-emitter-plugin': path.resolve(__dirname, '../paste-upload-emitter-plugin/src/public-api.ts'),
      '@textbus/sourcecode-mode-plugin': path.resolve(__dirname, '../sourcecode-mode-plugin/src/public-api.ts'),
      '@textbus/table-edit-enhance-plugin': path.resolve(__dirname, '../table-edit-enhance-plugin/src/public-api.ts'),
      '@textbus/toolbar': path.resolve(__dirname, '../toolbar/src/public-api.ts'),
      '@textbus/uikit': path.resolve(__dirname, '../uikit/src/public-api.ts')
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
