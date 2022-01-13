module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:6666',
        pathRewrite: {
          '^/api': ''
        }
      }
    }
  }
}
