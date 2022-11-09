(function (factory) {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    var v = factory(require, exports)
    if (v !== undefined) module.exports = v
  }
  else if (typeof define === 'function' && define.amd) {
    define(['require', 'exports', '@textbus/core'], factory)
  }
})(function (require, exports) {
  'use strict'
  Object.defineProperty(exports, '__esModule', { value: true })
  exports.Fragment = exports.jsx = exports.jsxs = void 0
  const core_1 = require('@textbus/core')
  Object.defineProperty(exports, 'jsx', { enumerable: true, get: function () { return core_1.jsx } })
  Object.defineProperty(exports, 'jsxs', { enumerable: true, get: function () { return core_1.jsxs } })
  Object.defineProperty(exports, 'Fragment', { enumerable: true, get: function () { return core_1.Fragment } })
})
