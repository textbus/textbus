/**
 * 选区焦点可视位置
 */
export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

const OVERFLOW_CLIP_VALUES = new Set(['auto', 'hidden', 'scroll', 'clip'])

function rectRight(r: Rect): number {
  return r.left + r.width
}

function rectBottom(r: Rect): number {
  return r.top + r.height
}

function isOverflowClipAxis(value: string): boolean {
  return OVERFLOW_CLIP_VALUES.has(value)
}

export interface OverflowClipAncestor {
  element: Element
  clipX: boolean
  clipY: boolean
}

export interface OverflowClipContext {
  /** 自内而外 */
  clipAncestors: OverflowClipAncestor[]
  scrollContainers: Element[]
  /** 嵌套滚动时最近的 overflow 容器 */
  firstScrollContainer: Element
}

function readOverflowClipAxes(style: CSSStyleDeclaration): Pick<OverflowClipAncestor, 'clipX' | 'clipY'> | null {
  const overflow = style.overflow
  const overflowX = style.overflowX
  const overflowY = style.overflowY
  if (!isOverflowClipAxis(overflow) &&
    !isOverflowClipAxis(overflowX) &&
    !isOverflowClipAxis(overflowY)) {
    return null
  }
  return {
    clipX: isOverflowClipAxis(overflowX) || isOverflowClipAxis(overflow),
    clipY: isOverflowClipAxis(overflowY) || isOverflowClipAxis(overflow),
  }
}

/**
 * 一次遍历祖先链：缓存 overflow 轴信息，并收集滚动监听目标。
 */
export function getOverflowClipContext(anchor: Node, extraRoot?: Element): OverflowClipContext {
  const clipAncestors: OverflowClipAncestor[] = []
  const scrollContainers = new Set<Element>()
  let node: Node | null = anchor.nodeType === Node.ELEMENT_NODE ? anchor : anchor.parentNode

  while (node) {
    if (node instanceof Element) {
      const flags = readOverflowClipAxes(getComputedStyle(node))
      if (flags) {
        clipAncestors.push({ element: node, clipX: flags.clipX, clipY: flags.clipY })
        scrollContainers.add(node)
      }
    }
    if (node === node.ownerDocument?.documentElement) {
      break
    }
    node = node.parentNode
  }

  const doc = anchor.ownerDocument
  const documentElement = doc?.documentElement ?? document.documentElement
  scrollContainers.add(documentElement)
  if (extraRoot) {
    scrollContainers.add(extraRoot)
  }

  return {
    clipAncestors,
    scrollContainers: [...scrollContainers],
    firstScrollContainer: clipAncestors[0]?.element ?? documentElement,
  }
}

function intersectRect(a: Rect, b: Rect): Rect | null {
  const left = Math.max(a.left, b.left)
  const top = Math.max(a.top, b.top)
  const right = Math.min(rectRight(a), rectRight(b))
  const bottom = Math.min(rectBottom(a), rectBottom(b))
  if (left >= right || top >= bottom) {
    return null
  }
  return { left, top, width: right - left, height: bottom - top }
}

function rectContainsPoint(rect: Rect, x: number, y: number): boolean {
  return x >= rect.left && x <= rectRight(rect) && y >= rect.top && y <= rectBottom(rect)
}

function intersectRectWithClipAncestor(
  ancestor: OverflowClipAncestor,
  visible: Rect,
): Rect | null {
  const el = ancestor.element
  const border = el.getBoundingClientRect()
  let left = visible.left
  let top = visible.top
  let right = rectRight(visible)
  let bottom = rectBottom(visible)

  if (ancestor.clipX) {
    const clipLeft = border.left + el.clientLeft
    const clipRight = clipLeft + el.clientWidth
    left = Math.max(left, clipLeft)
    right = Math.min(right, clipRight)
  }
  if (ancestor.clipY) {
    const clipTop = border.top + el.clientTop
    const clipBottom = clipTop + el.clientHeight
    top = Math.max(top, clipTop)
    bottom = Math.min(bottom, clipBottom)
  }

  if (left >= right || top >= bottom) {
    return null
  }
  return { left, top, width: right - left, height: bottom - top }
}

function getVisibleRectInOverflowClipsFromAncestors(
  rect: Rect,
  clipAncestors: OverflowClipAncestor[],
): Rect | null {
  let visible: Rect = rect
  for (const ancestor of clipAncestors) {
    const next = intersectRectWithClipAncestor(ancestor, visible)
    if (!next) {
      return null
    }
    visible = next
  }
  return visible
}

/** 锚点是否被 CSS 隐藏（opacity / visibility 等）；不做点命中，避免 mask 层挡住误判 */
function isCaretAnchorCssVisible(anchor: Node): boolean {
  const anchorEl: Element | null = anchor.nodeType === Node.ELEMENT_NODE ?
    anchor as Element :
    anchor.parentElement
  if (!anchorEl?.isConnected) {
    return false
  }
  if (typeof anchorEl.checkVisibility === 'function') {
    return anchorEl.checkVisibility({
      checkOpacity: true,
      checkVisibilityCSS: true,
    })
  }
  return true
}

const CLIP_INSET_EPSILON = 0.5

function clipPathInsetFromVisibleRegion(elRect: Rect, visible: Rect): string {
  const top = Math.max(0, visible.top - elRect.top)
  const left = Math.max(0, visible.left - elRect.left)
  const bottom = Math.max(0, rectBottom(elRect) - rectBottom(visible))
  const right = Math.max(0, rectRight(elRect) - rectRight(visible))
  if (top < CLIP_INSET_EPSILON && left < CLIP_INSET_EPSILON &&
    bottom < CLIP_INSET_EPSILON && right < CLIP_INSET_EPSILON) {
    return 'none'
  }
  return `inset(${top}px ${right}px ${bottom}px ${left}px)`
}

export interface CaretBoxLayout {
  boxHeight: number
  rectTop: number
}

/** 根据行高与内容矩形计算光标盒高度与顶部（视口坐标） */
export function measureCaretBoxLayout(contentRect: Rect, style: CSSStyleDeclaration): CaretBoxLayout {
  const {fontSize, lineHeight} = style
  let height: number
  if (isNaN(+lineHeight)) {
    const f = parseFloat(lineHeight)
    height = isNaN(f) ? parseFloat(fontSize) : f
  } else {
    height = parseFloat(fontSize) * parseFloat(lineHeight)
  }

  const boxHeight = Math.max(Math.floor(Math.max(height, contentRect.height)), 12)
  let rectTop = contentRect.top
  if (contentRect.height < height) {
    rectTop -= (height - contentRect.height) / 2
  }
  return {
    boxHeight,
    rectTop: Math.floor(rectTop),
  }
}

/** 测量行内旋转角度（writing-mode 继承） */
export function measureInlineCaretRotate(node: HTMLElement, initialRotate: number, writingMode: string): number {
  let rotate = initialRotate
  if (rotate !== 0) {
    const hackEle = document.createElement('span')
    hackEle.style.cssText = 'display: inline-block; width: 10px; height: 10px; position: relative; contain: layout style size; writing-mode: inherit'
    const pointEle = document.createElement('span')
    pointEle.style.cssText = 'position: absolute; left: 0; top: 0; width:0;height:0'
    hackEle.append(pointEle)
    node.append(hackEle)

    const p1 = pointEle.getBoundingClientRect()
    pointEle.style.right = '0'
    pointEle.style.left = ''
    const p2 = pointEle.getBoundingClientRect()
    rotate = Math.atan2(p1.y - p2.y, p1.x - p2.x) * 180 / Math.PI
    hackEle.remove()
  }
  if (writingMode === 'vertical-lr' || writingMode === 'vertical-rl') {
    rotate += 90
  }
  return rotate
}

export interface CaretPresentation {
  outOfView: boolean
  clipPath: string
  layoutElRect: Rect
  position: { left: number; top: number; height: number }
  caretColor: string
  style: { height: string; lineHeight: string; fontSize: string }
}

export interface ComputeCaretPresentationOptions {
  anchor: HTMLElement
  maskRect: Rect
  clipAncestors: OverflowClipAncestor[]
  maskLeft: number
  maskTop: number
  boxHeight: number
  rectTop: number
  contentRect: Rect
  fontSize: string
  color: string
  measureElementRect: () => Rect
}

/**
 * 在 element 样式已写入后调用：计算裁剪、是否移出视口及对外事件数据。
 */
export function computeCaretPresentation(options: ComputeCaretPresentationOptions): CaretPresentation {
  const {
    anchor,
    maskRect,
    clipAncestors,
    maskLeft,
    maskTop,
    boxHeight,
    rectTop,
    contentRect,
    fontSize,
    color,
    measureElementRect,
  } = options

  const caretCenterX = contentRect.left + contentRect.width / 2
  const caretCenterY = rectTop + boxHeight / 2
  const layoutElRect: Rect = {
    left: maskRect.left + maskLeft,
    top: maskRect.top + maskTop,
    width: 2,
    height: boxHeight,
  }

  let visibleRect = getVisibleRectInOverflowClipsFromAncestors(layoutElRect, clipAncestors)
  visibleRect = visibleRect ? intersectRect(visibleRect, maskRect) : null
  const inClipBounds = !!visibleRect && rectContainsPoint(visibleRect, caretCenterX, caretCenterY)
  const outOfView = !inClipBounds || !isCaretAnchorCssVisible(anchor)

  let clipPath = 'none'
  if (!outOfView && visibleRect) {
    clipPath = clipPathInsetFromVisibleRegion(measureElementRect(), visibleRect)
  }

  return {
    outOfView,
    clipPath,
    layoutElRect,
    position: { left: maskLeft, top: rectTop, height: boxHeight },
    caretColor: color === 'rgba(0, 0, 0, 0)' ? '#000' : color,
    style: {
      height: boxHeight + 'px',
      lineHeight: boxHeight + 'px',
      fontSize,
    },
  }
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
