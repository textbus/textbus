/**
 * jsdom 未完整实现布局相关 API，平台代码在恢复选区时会调用 Range#getBoundingClientRect。
 */
const stubDOMRect = (): DOMRect => {
  const r = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    toJSON() {
      return r
    }
  }
  return r as DOMRect
}

if (typeof Range !== 'undefined') {
  Range.prototype.getBoundingClientRect = function () {
    return stubDOMRect()
  }
}
