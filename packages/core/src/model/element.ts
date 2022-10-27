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

export type VElementJSXChildNode = VElement | VFragment | VTextNode | string | number | boolean | null | undefined

export interface VElementOptions {
  [key: string]: any
}

export interface VElementProps extends VElementOptions {
  children?: Array<VElementJSXChildNode>
}


export interface VElementRenderFn {
  (props: VElementProps | null): VElement;
}

export interface VElementListeners {
  [listenKey: string]: <T extends Event>(ev: T) => any;
}

export function Fragment(fragment: { children: VElementJSXChildNode[] }) {
  return new VFragment(fragment.children)
}

export function jsx(tagName: string | VElementRenderFn,
                    props: VElementProps = {}) {
  const children = props.children
  Reflect.deleteProperty(props, 'children')
  if (children) {
    return VElement.createElement(tagName, props, children)
  }
  return VElement.createElement(tagName, props)
}

export function jsxs(tagName: string | VElementRenderFn, props: VElementProps = {}) {
  return jsx(tagName, props)
}

export class VFragment {
  constructor(public children: VElementJSXChildNode[]) {
  }
}

function append(children: Array<VElement | VTextNode>, node: VElementJSXChildNode) {
  if (node instanceof VElement) {
    children.push(node)
  } else if (node instanceof VTextNode) {
    if (node.textContent) {
      children.push(node)
    }
  } else if (typeof node === 'string' && node.length > 0) {
    children.push(new VTextNode(node))
  } else if (node instanceof VFragment) {
    for (const item of node.children.flat()) {
      append(children, item)
    }
  } else if (node !== false && node !== true && node !== null && typeof node !== 'undefined') {
    children.push(new VTextNode(String(node)))
  }
}

/**
 * Textbus 虚拟 DOM 元素节点
 */
export class VElement {
  static createElement(tagName: string | VElementRenderFn,
                       attrs: VElementOptions | null = null,
                       ...childNodes: VElementJSXChildNode[] | VElementJSXChildNode[][]) {
    const children: Array<VElement | VTextNode> = []
    childNodes.flat(2).forEach(i => {
      append(children, i)
    })
    if (typeof tagName === 'function') {
      return tagName({
        ...attrs,
        children
      })
    }
    return new VElement(tagName, attrs, children)
  }

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
              children: Array<VElement | VTextNode> = []) {
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

    this.appendChild(...children)
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
