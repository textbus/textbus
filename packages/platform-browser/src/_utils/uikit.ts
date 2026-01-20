/**
 * 选区焦点可视位置
 */
export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export interface UIElementParams {
  classes?: string[]
  attrs?: {[key: string]: any}
  props?: {[key: string]: any}
  styles?: {[key: string]: any}
  children?: (Node | null)[]
  on?: Record<string, (ev: Event) => void>
}

export function createElement(tagName: string, options: UIElementParams = {}): HTMLElement {
  const el = document.createElement(tagName)
  if (options.classes) {
    el.classList.add(...options.classes)
  }
  if (options.attrs) {
    Object.keys(options.attrs).forEach(key => {
      el.setAttribute(key, options.attrs![key])
    })
  }
  if (options.props) {
    Object.keys(options.props).forEach(key => {
      (el as any)[key] = options.props![key]
    })
  }
  if (options.styles) {
    Object.assign(el.style, options.styles)
  }
  if (options.children) {
    options.children.filter(i => i).forEach(item => {
      el.appendChild(item as Node)
    })
  }
  if (options.on) {
    Object.keys(options.on).forEach(key => {
      el.addEventListener(key, options.on![key])
    })
  }
  return el
}

export function getLayoutRectByRange(range: Range): Rect {
  let { startContainer, startOffset } = range
  if (startContainer.nodeType === Node.TEXT_NODE) {
    if (startOffset > 0) {
      return range.getBoundingClientRect()
    }
    const parentNode = startContainer.parentNode!
    startOffset = Array.from(parentNode.childNodes).indexOf(startContainer as any)
    startContainer = parentNode
  }

  const beforeNode = startContainer.childNodes[startOffset - 1]
  if (beforeNode) {
    if (beforeNode.nodeType === Node.ELEMENT_NODE && beforeNode.nodeName.toLowerCase() !== 'br') {
      const rect = (beforeNode as HTMLElement).getBoundingClientRect()
      return {
        left: rect.right,
        top: rect.top,
        width: range.collapsed ? 1 : rect.width,
        height: rect.height
      }
    } else if (beforeNode.nodeType === Node.TEXT_NODE) {
      const range2 = document.createRange()
      range2.setStart(beforeNode, beforeNode.textContent!.length)
      range2.setEnd(beforeNode, beforeNode.textContent!.length)
      const rect = range2.getBoundingClientRect()
      return {
        left: rect.right,
        top: rect.top,
        width: range.collapsed ? 1 : rect.width,
        height: rect.height
      }
    }
  }
  const offsetNode = startContainer.childNodes[startOffset]
  let isInsertBefore = false
  if (!offsetNode) {
    const lastChild = startContainer.lastChild
    if (lastChild && lastChild.nodeType === Node.ELEMENT_NODE) {
      const rect = (lastChild as HTMLElement).getBoundingClientRect()
      return {
        left: rect.right,
        top: rect.top,
        width: range.collapsed ? 1 : rect.width,
        height: rect.height
      }
    }
  }
  if (offsetNode) {
    if (offsetNode.nodeType === Node.ELEMENT_NODE && offsetNode.nodeName.toLowerCase() !== 'br') {
      const rect = (offsetNode as HTMLElement).getBoundingClientRect()
      return {
        left: rect.left,
        top: rect.top,
        width: range.collapsed ? 1 : rect.width,
        height: rect.height
      }
    }
    isInsertBefore = true
  }
  const span = startContainer.ownerDocument!.createElement('span')
  span.innerText = '\u200b'
  span.style.display = 'inline-block'
  if (isInsertBefore) {
    startContainer.insertBefore(span, offsetNode)
  } else {
    startContainer.appendChild(span)
  }
  const rect = span.getBoundingClientRect()
  startContainer.removeChild(span)
  return {
    left: rect.left,
    top: rect.top,
    width: range.collapsed ? 1 : rect.width,
    height: rect.height
  }
}
