import { Slot } from './slot'
import { ComponentInstance } from './component'

/**
 * Textbus 虚拟 DOM 文本节点
 */
export class VTextNode {
  constructor(public textContent = '') {
  }
}

export interface VElementListeners {
  [listenKey: string]: <T extends Event>(ev: T) => any;
}

export type VChildNode = VElement | VTextNode | ComponentInstance | string | number | boolean | null | undefined

function append(children: VChildNode[], node: VChildNode) {
  if (node instanceof VElement) {
    children.push(node)
  } else if (node instanceof VTextNode) {
    if (node.textContent) {
      children.push(node)
    }
  } else if (typeof node === 'string' && node.length > 0) {
    children.push(new VTextNode(node))
  } else if (Array.isArray(node)) {
    for (const item of node.flat()) {
      append(children, item)
    }
  } else if (node !== false && node !== true && node !== null && typeof node !== 'undefined') {
    children.push(new VTextNode(String(node)))
  }
}

/**
 * 虚拟 DOM 节点在数据内的范围
 */
export interface NodeLocation {
  startIndex: number
  endIndex: number
  slot: Slot
}

/**
 * Textbus 虚拟 DOM 元素节点
 */
export class VElement {
  children: Array<VElement | VTextNode | ComponentInstance> = []
  location: NodeLocation | null = null

  readonly attrs = new Map<string, any>()
  readonly styles = new Map<string, string | number>()
  readonly classes = new Set<string>()
  readonly listeners: VElementListeners = {}


  constructor(public tagName: string,
              attrs?: Record<string, any>,
              children?: VChildNode[]) {
    if (!attrs) {
      return
    }
    Object.keys(attrs).forEach(key => {
      if (key === 'class') {
        const className = (attrs!.class || '').trim();
        (this as any).classes = new Set<string>(className ? className.split(/\s+/g) : [])
      } else if (key === 'style') {
        const style = attrs!.style || ''
        if (typeof style === 'string') {
          style.split(';').map(s => s.split(':')).forEach(v => {
            if (!v[0] || !v[1]) {
              return
            }
            this.styles.set(v[0].trim(), v[1].trim())
          })
        } else if (typeof style === 'object') {
          Object.keys(style).forEach(key => {
            this.styles.set(key, style[key])
          })
        }
      } else if (/^on[A-Z]/.test(key)) {
        const listener = attrs![key]
        if (typeof listener === 'function') {
          this.listeners[key.replace(/^on/, '').toLowerCase()] = listener
        }
      } else {
        this.attrs.set(key, attrs![key])
      }
    })
    if (children) {
      children.flat(2).forEach(i => {
        append(this.children, i)
      })
    }
  }

  /**
   * 在最后位置添加一个子节点。
   * @param newNodes
   */
  appendChild(...newNodes: Array<VElement | VTextNode | ComponentInstance>) {
    this.children.push(...newNodes)
  }
}
