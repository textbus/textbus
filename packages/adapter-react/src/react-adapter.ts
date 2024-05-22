import { Component, CompositionState, makeError, VElement, ViewMount, VTextNode } from '@textbus/core'
import { DomAdapter } from '@textbus/platform-browser'
import { createElement, JSX, useEffect, useState } from 'react'

const adapterError = makeError('ReactAdapter')

export interface ViewComponentProps<T extends Component> {
  component: T
  rootRef: ((rootNode: HTMLElement) => void)
}

export interface ReactAdapterComponents {
  [key: string]: (props: ViewComponentProps<any>) => JSX.Element
}

export class ReactAdapter extends DomAdapter<JSX.Element, JSX.Element> {
  private components: Record<string, (props: {component: Component}) => JSX.Element> = {}

  constructor(components: ReactAdapterComponents,
              mount: ViewMount<JSX.Element, HTMLElement>) {
    super({
      createCompositionNode(compositionState: CompositionState,
                            updateNativeCompositionNode: (nativeNode: (HTMLElement | null)) => void): VElement {
        return new VElement('span', {
          style: {
            textDecoration: 'underline'
          },
          ref: (node: HTMLElement) => {
            updateNativeCompositionNode(node)
          }
        }, [
          new VTextNode(compositionState.text)
        ])
      },
      getParentNode(node: HTMLElement | Text): HTMLElement | null {
        return (node as Node).parentNode as HTMLElement
      },
      getChildNodes(parentElement: HTMLElement): Array<HTMLElement | Text> {
        return Array.from(parentElement.childNodes) as HTMLElement[]
      },
      isNativeElementNode(node: HTMLElement | Text): node is HTMLElement {
        return node instanceof HTMLElement
      },
      getChildByIndex(parentElement, index) {
        return parentElement.childNodes[index] as HTMLElement
      },
      getAndUpdateSlotRootNativeElement(vEle: VElement, update: (nativeElement: (HTMLElement | null)) => void) {
        const currentRef = vEle.attrs.get('ref')
        if (currentRef) {
          vEle.attrs.set('ref', (v: HTMLElement) => {
            update(v)
            if (typeof currentRef === 'function') {
              currentRef(v)
            } else if (!currentRef.current) {
              currentRef.current = v
            }
          })
        } else {
          vEle.attrs.set('ref', update)
        }
      },
      componentRender: (component: Component<any>): JSX.Element => {
        const comp = this.components[component.name] || this.components['*']
        if (comp) {
          component.changeMarker.rendered()
          return createElement(comp, {
            key: component.id,
            component
          })
        }
        throw adapterError(`cannot found view component \`${component.name}\`!`)
      },
      vElementToViewElement(vNode: VElement, children: Array<string | JSX.Element>): JSX.Element {
        const props: any = {
          ...(Array.from(vNode.attrs).reduce((a, b) => {
            a[b[0]] = b[1]
            return a
          }, {} as Record<string, any>))
        }
        if (vNode.classes.size) {
          props.className = Array.from(vNode.classes).join(' ')
        }
        if (vNode.styles) {
          props.style = Array.from(vNode.styles).reduce((a, b) => {
            a[b[0]] = b[1]
            return a
          }, {} as Record<string, any>)
        }
        return createElement(vNode.tagName, props, ...children)
      }
    }, mount)
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
        component.__slots__.forEach(i => this.renderedSlotCache.delete(i))
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
        useEffect(() => {
          const context = this.componentRendingStack[this.componentRendingStack.length - 1]!
          if (context === component) {
            this.componentRendingStack.pop()
          }

          if (!this.componentRootElementCaches.get(component)) {
            // eslint-disable-next-line max-len
            throw adapterError(`Component \`${component.name}\` is not bound to rootRef, you must bind rootRef to the root element node of the component view.`)
          }
        })
        return vNode
      }
    })
  }

  override copy() {
    document.execCommand('copy')
  }
}
