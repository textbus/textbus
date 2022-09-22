import { makeError } from '../_utils/make-error'

const vElementErrorFn = makeError('VElement')
const parentNode = Symbol('parentNode')

/**
 * Textbus 虚拟 DOM 文本节点
 */
export class VTextNode {
  get parentNode() {
    return this[parentNode]
  }

  [parentNode]: VElement | null = null

  constructor(public textContent = '') {
  }
}

export type VElementJSXChildNode = VElement | VTextNode | string | number | boolean | null | undefined

export interface VElementRenderFn {
  (props: { [key: string]: any }): VElement;
}

export interface VElementOptions {
  [key: string]: any
}

export interface VElementProps extends VElementOptions {
  children: Array<VElement | VTextNode>
}

export interface VElementListeners {
  [listenKey: string]: <T extends Event>(ev: T) => any;
}

export function jsx(tagName: string | VElementRenderFn,
                    attrs: VElementOptions | null = null,
                    ...children: VElementJSXChildNode[] | VElementJSXChildNode[][]) {
  if (typeof tagName === 'function') {
    return tagName({
      ...attrs,
      children
    })
  }
  const vNode = new VElement(tagName, attrs)
  children.flat().forEach(i => {
    if (i instanceof VElement) {
      vNode.appendChild(i)
    } else if (typeof i === 'string' && i.length > 0) {
      vNode.appendChild(new VTextNode(i))
    } else if (i !== false && i !== true && i !== null && typeof i !== 'undefined') {
      vNode.appendChild(new VTextNode(String(i)))
    }
  })
  return vNode
}

export function jsxs(tagName: string, props: VElementProps) {
  const children = props.children
  Reflect.deleteProperty(props, 'children')
  return new VElement(tagName, props, children)
}

/**
 * Textbus 虚拟 DOM 元素节点
 */
export class VElement {
  static createElement = jsx

  get parentNode() {
    return this[parentNode]
  }

  get children() {
    return [...this._children]
  }

  [parentNode]: VElement | null = null
  readonly attrs = new Map<string, any>()
  readonly styles = new Map<string, string | number>()
  readonly classes: Set<string>

  readonly listeners: VElementListeners

  private _children: Array<VElement | VTextNode> = []

  constructor(public tagName: string,
              attrs: VElementOptions | null = null,
              children: Array<VElement | VTextNode | string> = []) {
    attrs = attrs || {}
    const className = (attrs.class || '').trim()
    this.classes = new Set<string>(className ? className.split(/\s+/g) : [])

    Reflect.deleteProperty(attrs, 'class')

    const style = attrs.style || ''
    const styles = new Map<string, string | number>()
    if (typeof style === 'string') {
      style.split(';').map(s => s.split(':')).forEach(v => {
        if (!v[0] || !v[1]) {
          return
        }
        styles.set(v[0].trim(), v[1].trim())
      })
    } else if (typeof style === 'object') {
      Object.keys(style).forEach(key => {
        styles.set(key, style[key])
      })
    }

    this.styles = styles

    Reflect.deleteProperty(attrs, 'style')
    Reflect.deleteProperty(attrs, 'slot')
    this.listeners = {}
    Object.keys(attrs).forEach(key => {
      if (/^on[A-Z]/.test(key)) {
        const listener = attrs![key]
        if (typeof listener === 'function') {
          this.listeners[key.replace(/^on/, '').toLowerCase()] = listener
        }
      } else {
        this.attrs.set(key, attrs![key])
      }
    })

    this.appendChild(...children.filter(i => i).map(i => {
      if (typeof i === 'string') {
        return new VTextNode(i)
      }
      return i
    }))
  }

  /**
   * 在最后位置添加一个子节点。
   * @param newNodes
   */
  appendChild(...newNodes: Array<VElement | VTextNode>) {
    newNodes.forEach(node => {
      node.parentNode?.removeChild(node)
      node[parentNode] = this
      this._children.push(node)
    })
  }

  removeChild(node: VTextNode | VElement) {
    const index = this._children.indexOf(node)
    if (index > -1) {
      this._children.splice(index, 1)
      node[parentNode] = null
      return
    }
    throw vElementErrorFn('node to be deleted is not a child of the current node.')
  }

  replaceChild(newNode: VElement | VTextNode, oldNode: VElement | VTextNode) {
    const index = this._children.indexOf(oldNode)
    if (index > -1) {
      newNode.parentNode?.removeChild(newNode)
      this._children.splice(index, 1, newNode)
      oldNode[parentNode] = null
      newNode[parentNode] = this
      return
    }
    throw vElementErrorFn('node to be replaced is not a child of the current node.')
  }
}
