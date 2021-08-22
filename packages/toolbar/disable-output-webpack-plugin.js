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
