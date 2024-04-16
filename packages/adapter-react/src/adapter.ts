import { createElement, JSX, ReactNode, useEffect, useState } from 'react'
import { Subject } from '@tanbo/stream'
import {
  Component,
  makeError,
  replaceEmpty,
  Slot,
  VElement,
  VTextNode
} from '@textbus/core'
import { DomAdapter } from '@textbus/platform-browser'

// hack start
// 在 composition 输入时，浏览器会默认删除占位节点（<br>），这会导致 react 在 diff 时报错
const oldRemoveChild = Node.prototype.removeChild
Node.prototype.removeChild = function (this: any, child: any) {
  if (child) {
    if (!child.parentNode) {
      return child
    }
  }
  return oldRemoveChild.call(this, child)
}
// hack end

const adapterError = makeError('ReactAdapter')

export interface ViewComponentProps<T extends Component = Component> {
  component: T
  rootRef: ((rootNode: HTMLElement) => void)
}

export interface ReactAdapterComponents {
  [key: string]: (props: ViewComponentProps) => JSX.Element
}

/**
 * Textbus 桥接 React 渲染能力适配器，用于在 React 项目中渲染 Textbus 数据
 */
export class Adapter extends DomAdapter<JSX.Element, JSX.Element> {
  onViewUpdated = new Subject<void>()

  private components: Record<string, (props: {component: Component}) => JSX.Element> = {}
  private componentRendingStack: Component[] = []

  constructor(components: ReactAdapterComponents,
              mount: (host: HTMLElement, root: JSX.Element) => (void | (() => void))) {
    super(mount)
    Object.keys(components).forEach(key => {
      this.components[key] = (props: {component: Component}) => {
        const component = props.component
        const [updateKey, refreshUpdateKey] = useState(Math.random())

        useEffect(() => {
          const sub = component.changeMarker.onChange.subscribe(() => {
            if (component.changeMarker.dirty) {
              refreshUpdateKey(Math.random())
            }
          })
          return () => {
            sub.unsubscribe()
          }
        }, [])
        useEffect(() => {
          this.onViewUpdated.next()
        }, [updateKey])
        component.__slots__.length = 0
        this.componentRendingStack.push(component)
        const vNode = components[key]({
          component,
          rootRef: (rootNode: HTMLElement) => {
            if (rootNode) {
              this.componentRootElementCaches.set(component, rootNode)
            } else {
              this.componentRootElementCaches.remove(component)
            }
          }
        })
        this.componentRendingStack.pop()
        return vNode
      }
    })
  }

  componentRender(component: Component): JSX.Element {
    const comp = this.components[component.name] || this.components['*']
    if (comp) {
      component.changeMarker.rendered()
      return createElement(comp, {
        key: component.id,
        component
      })
    }
    throw adapterError(`cannot found view component \`${component.name}\`!`)
  }

  slotRender(slot: Slot,
             slotHostRender: (children: Array<VElement | VTextNode | Component>) => VElement,
             renderEnv?: any): JSX.Element {
    const context = this.componentRendingStack[this.componentRendingStack.length - 1]!
    context.__slots__.push(slot)
    const vElement = slot.toTree(slotHostRender, renderEnv)
    this.slotRootVElementCaches.set(slot, vElement)

    const vNodeToJSX = (vNode: VElement) => {
      const children: ReactNode[] = []

      for (let i = 0; i < vNode.children.length; i++) {
        const child = vNode.children[i]
        if (child instanceof VElement) {
          children.push(vNodeToJSX(child))
        } else if (child instanceof VTextNode) {
          children.push(replaceEmpty(child.textContent))
        } else {
          children.push(this.componentRender(child))
        }
      }
      const props: any = {
        ...(Array.from(vNode.attrs).reduce((a, b) => {
          a[b[0]] = b[1]
          return a
        }, {}))
      }
      if (vNode.classes.size) {
        props.className = Array.from(vNode.classes).join(' ')
      }
      if (vNode.styles) {
        props.style = Array.from(vNode.styles).reduce((a, b) => {
          a[b[0]] = b[1]
          return a
        }, {})
      }
      return createElement(vNode.tagName, props, ...children)
    }

    const refFn = (nativeNode: HTMLElement) => {
      if (!nativeNode) {
        this.slotRootNativeElementCaches.remove(slot)
      } else {
        this.slotRootNativeElementCaches.set(slot, nativeNode)
      }
    }
    const currentRef = vElement.attrs.get('ref')
    if (currentRef) {
      vElement.attrs.set('ref', (v: HTMLElement) => {
        refFn(v)
        if (typeof currentRef === 'function') {
          currentRef(v)
        } else if (!currentRef.current) {
          currentRef.current = v
        }
      })
    } else {
      vElement.attrs.set('ref', refFn)
    }

    slot.changeMarker.rendered()
    return vNodeToJSX(vElement)
  }
}
