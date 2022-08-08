import { Rect } from '@textbus/core'

/**
 * 获取元素到窗口左上角的距离和宽高，用以代替原生 getBoundingClientRect，因为原生性能太差
 * @param el
 */
export function getBoundingClientRect(el: HTMLElement): Rect {
  const rect: Rect = {
    left: 0,
    top: 0,
    width: el.offsetWidth,
    height: el.offsetHeight
  }
  while (el) {
    rect.left += el.offsetLeft - el.scrollLeft
    rect.top += el.offsetTop - el.scrollTop
    const offsetParent = el.offsetParent
    let parentElement = el.parentElement
    while (parentElement && parentElement !== offsetParent) {
      rect.left -= parentElement.scrollLeft
      rect.top -= parentElement.scrollTop
      parentElement = parentElement.parentElement
    }
    el = offsetParent as HTMLElement
  }
  return rect
}
