import { Injectable } from '@tanbo/di'
import { NativeNode, NativeRenderer } from '@textbus/core'

/**
 * Textbus PC 端浏览器渲染能力实现
 */
@Injectable()
export class DomRenderer implements NativeRenderer {
  isSVG = new RegExp(`^(${
    [
      // 'a',
      'animate',
      'animateMotion',
      'animateTransform',
      'circle',
      'clipPath',
      'defs',
      'desc',
      'ellipse',
      'feBlend',
      'feColorMatrix',
      'feComponentTransfer',
      'feComposite',
      'feConvolveMatrix',
      'feDiffuseLighting',
      'feDisplacementMap',
      'feDistantLight',
      'feDropShadow',
      'feFlood',
      'feFuncA',
      'feFuncB',
      'feFuncG',
      'feFuncR',
      'feGaussianBlur',
      'feImage',
      'feMerge',
      'feMergeNode',
      'feMorphology',
      'feOffset',
      'fePointLight',
      'feSpecularLighting',
      'feSpotLight',
      'feTile',
      'feTurbulence',
      'filter',
      'foreignObject',
      'g',
      'image',
      'line',
      'linearGradient',
      'marker',
      'mask',
      'metadata',
      'mpath',
      'path',
      'pattern',
      'polygon',
      'polyline',
      'radialGradient',
      'rect',
      // 'script',
      'set',
      'stop',
      // 'style',
      'svg',
      'switch',
      'symbol',
      'text',
      'textPath',
      'title',
      'tspan',
      'use',
      'view'
    ].join('|')
  })$`, 'i')

  listen<T = any>(node: NativeNode, type: string, callback: (ev: T) => any) {
    node.addEventListener(type, callback)
  }

  unListen(node: NativeNode, type: string, callback: (ev: any) => any) {
    node.removeEventListener(type, callback)
  }

  createTextNode(textContent: string): NativeNode {
    return document.createTextNode(DomRenderer.replaceEmpty(textContent, '\u00a0'))
  }

  createElement(name: string): NativeNode {
    if (this.isSVG.test(name)) {
      return document.createElementNS('http://www.w3.org/2000/svg', name)
    }
    return document.createElement(name)
  }

  appendChild(parent: NativeNode, newChild: NativeNode) {
    // if (/^text$/i.test(parent.nodeName) && typeof parent.ownerSVGElement !== 'undefined' && newChild.nodeType === Node.TEXT_NODE) {
    //   parent.textContent = newChild.textContent
    //   return
    // }
    parent.appendChild(newChild)
  }

  remove(node: NativeNode) {
    node.parentNode.removeChild(node)
  }

  insertBefore(newNode: NativeNode, ref: NativeNode) {
    ref.parentNode.insertBefore(newNode, ref)
  }

  getChildByIndex(parent: NativeNode, index: number): NativeNode | null {
    return parent.childNodes[index] || null
  }

  addClass(target: NativeNode, name: string) {
    target.classList.add(name)
  }

  removeClass(target: NativeNode, name: string) {
    target.classList.remove(name)
  }

  setStyle(target: NativeNode, key: string, value: any) {
    target.style[key] = value
  }

  setAttribute(target: NativeNode, key: string, value: string) {
    target.setAttribute(key, value)
  }

  removeAttribute(target: NativeNode, key: string) {
    target.removeAttribute(key)
  }

  replace(newChild: NativeNode, oldChild: NativeNode) {
    oldChild.parentNode.replaceChild(newChild, oldChild)
  }

  copy() {
    document.execCommand('copy')
  }

  static replaceEmpty(s: string, target: string) {
    return s.replace(/\s\s+/g, str => {
      return ' ' + Array.from({
        length: str.length - 1
      }).fill(target).join('')
    }).replace(/^\s|\s$/g, target)
  }
}
