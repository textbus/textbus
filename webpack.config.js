const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const path = require('path');
const EslintWebpackPlugin = require('eslint-webpack-plugin')
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
      '@textbus/core$': path.resolve(__dirname, './packages/core/src/public-api.ts'),
      '@textbus/core/*': path.resolve(__dirname, './packages/core/'),
      '@textbus/browser': path.resolve(__dirname, './packages/browser/src/public-api.ts'),
      '@textbus/browser/*': path.resolve(__dirname, './packages/browser/'),
      '@textbus/editor': path.resolve(__dirname, './packages/editor/src/public-api.ts'),
      '@textbus/editor/*': path.resolve(__dirname, './packages/editor/'),
    }
  },
  devServer: {
    host: 'localhost',
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 8888,
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
    new EslintWebpackPlugin({
      extensions: ['.ts', '.tsx']
    }),
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin({
      template: 'index.html'
    })
  ]
};
