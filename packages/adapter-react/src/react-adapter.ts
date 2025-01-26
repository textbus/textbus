import { Adapter, Component, CompositionState, makeError, VElement, ViewMount, VTextNode } from '@textbus/core'
import { DomAdapter } from '@textbus/platform-browser'
import { createElement, JSX, useEffect, useState } from 'react'
import { Injector, ReflectiveInjector } from '@viewfly/core'
import { merge } from '@tanbo/stream'

const adapterError = makeError('ReactAdapter')

export interface ViewComponentProps<T extends Component> {
  component: T
  rootRef: ((rootNode: Element) => void)
}

export interface ReactAdapterComponents {
  [key: string]: (props: ViewComponentProps<any>) => JSX.Element
}

export class ReactAdapter extends DomAdapter<JSX.Element, JSX.Element> {
  private components: Record<string, (props: {component: Component}) => JSX.Element> = {}

  constructor(components: ReactAdapterComponents,
              mount: ViewMount<JSX.Element, Element>) {
    super({
      createCompositionNode(compositionState: CompositionState,
                            updateNativeCompositionNode: (nativeNode: (Element | null)) => void): VElement {
        return new VElement('span', {
          style: {
            textDecoration: 'underline'
          },
          ref: (node: Element) => {
            updateNativeCompositionNode(node)
          }
        }, [
          new VTextNode(compositionState.text)
        ])
      },
      getParentNode(node: Element | Text): Element | null {
        return (node as Node).parentNode as Element
      },
      getChildNodes(parentElement: Element): Array<Element | Text> {
        return Array.from(parentElement.childNodes) as Element[]
      },
      isNativeElementNode(node: Element | Text): node is Element {
        return node instanceof Element
      },
      getChildByIndex(parentElement, index) {
        return parentElement.childNodes[index] as Element
      },
      getAndUpdateSlotRootNativeElement(vEle: VElement, update: (nativeElement: (Element | null)) => void) {
        const currentRef = vEle.attrs.get('ref')
        if (currentRef) {
          vEle.attrs.set('ref', (v: Element) => {
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
          const sub = merge(component.changeMarker.onChange, component.changeMarker.onForceChange).subscribe(() => {
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
        const vNode = components[key]({
          component,
          rootRef: (rootNode: Element) => {
            if (rootNode) {
              this.componentRootElementCaches.set(component, rootNode)
            } else {
              this.componentRootElementCaches.remove(component)
            }
          }
        })
        useEffect(() => {
          if (!this.componentRootElementCaches.get(component)) {
            // eslint-disable-next-line max-len
            throw adapterError(`Component \`${component.name}\` is not bound to rootRef, you must bind rootRef to the root element node of the component view.`)
          }
        })
        return vNode
      }
    })
  }

  override render(rootComponent: Component, injector: Injector): void | (() => void) {
    const childInjector = new ReflectiveInjector(injector, [{
      provide: Adapter,
      useValue: this
    }, {
      provide: DomAdapter,
      useValue: this
    }, {
      provide: ReactAdapter,
      useValue: this
    }])
    return super.render(rootComponent, childInjector)
  }

  override copy() {
    document.execCommand('copy')
  }
}
