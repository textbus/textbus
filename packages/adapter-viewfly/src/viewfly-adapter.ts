import { Component, CompositionState, makeError, VElement, ViewMount, VTextNode, merge } from '@textbus/core'
import { createDynamicRef, DynamicRef, getCurrentInstance, jsx, onUpdated, withAnnotation } from '@viewfly/core'
import { DomAdapter } from '@textbus/platform-browser'

const adapterError = makeError('ViewflyDOMRenderer')

export interface ViewComponentProps<T extends Component> {
  component: T
  rootRef: DynamicRef<HTMLElement>
}

export interface ViewflyAdapterComponents {
  [key: string]: JSXInternal.ComponentSetup<ViewComponentProps<any>>
}

export class ViewflyAdapter extends DomAdapter<JSXInternal.ViewNode, JSXInternal.Element> {
  private components: ViewflyAdapterComponents = {}

  private componentRefs = new WeakMap<Component, DynamicRef<HTMLElement>>()

  constructor(components: ViewflyAdapterComponents,
              mount: ViewMount<JSXInternal.ViewNode, HTMLElement>
  ) {
    super({
      createCompositionNode(compositionState: CompositionState,
                            updateNativeCompositionNode: (nativeNode: (HTMLElement | null)) => void): VElement {
        const ref = createDynamicRef<HTMLElement>(node => {
          updateNativeCompositionNode(node)
          return () => {
            updateNativeCompositionNode(null)
          }
        })
        return new VElement('span', {
          style: {
            textDecoration: 'underline'
          },
          ref
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
        const ref = createDynamicRef<HTMLElement>(nativeNode => {
          update(nativeNode)
        })
        if (currentRef instanceof DynamicRef) {
          vEle.attrs.set('ref', [currentRef, ref])
        } else if (Array.isArray(currentRef)) {
          currentRef.push(ref)
        } else {
          vEle.attrs.set('ref', ref)
        }
      },
      componentRender: (component: Component<any>): JSXInternal.ViewNode => {
        const comp = this.components[component.name] || this.components['*']
        if (comp) {
          let ref = this.componentRefs.get(component)
          if (!ref) {
            ref = createDynamicRef<HTMLElement>(rootNode => {
              this.componentRootElementCaches.set(component, rootNode)
              return () => {
                this.componentRootElementCaches.remove(component)
              }
            })
            this.componentRefs.set(component, ref)
          }
          return jsx(comp, {
            component,
            rootRef: ref
          }, component.id)
        }
        throw adapterError(`cannot found view component \`${component.name}\`!`)
      },
      vElementToViewElement(vNode: VElement, children: Array<string | JSXInternal.ViewNode>): JSXInternal.ViewNode {
        const key = vNode.attrs.get('key')
        vNode.attrs.delete('key')
        const props: any = {
          ...(Array.from(vNode.attrs).reduce((a, b) => {
            a[b[0]] = b[1]
            return a
          }, {})),
        }
        if (vNode.classes.size) {
          props.class = Array.from(vNode.classes).join(' ')
        }
        if (vNode.styles) {
          props.style = Array.from(vNode.styles).reduce((a, b) => {
            a[b[0]] = b[1]
            return a
          }, {})
        }
        if (children.length) {
          props.children = children
        }
        return jsx(vNode.tagName, props, key)
      }
    }, mount)

    let isRoot = true
    Object.entries(components).forEach(([key, viewFlyComponent]) => {
      this.components[key] = withAnnotation({
        ...viewFlyComponent.annotation
      }, (props: ViewComponentProps<Component>) => {
        const comp = getCurrentInstance()
        const textbusComponent = props.component
        merge(textbusComponent.changeMarker.onChange,
          textbusComponent.changeMarker.onForceChange).subscribe(() => {
          if (textbusComponent.changeMarker.dirty) {
            comp.markAsDirtied()
          }
        })
        if (isRoot) {
          onUpdated(() => {
            this.onViewUpdated.next()
          })
          isRoot = false
        }
        onUpdated(() => {
          const context = this.componentRendingStack[this.componentRendingStack.length - 1]!
          if (context === component) {
            this.componentRendingStack.pop()
          }
          textbusComponent.changeMarker.rendered()
          if (!this.componentRootElementCaches.get(textbusComponent)) {
            // eslint-disable-next-line max-len
            throw adapterError(`Component \`${textbusComponent.name}\` is not bound to rootRef, you must bind rootRef to the root element node of the component view.`)
          }
        })
        const component = props.component
        const instance = viewFlyComponent(props)
        if (typeof instance === 'function') {
          return () => {
            component.__slots__.forEach(i => this.renderedSlotCache.delete(i))
            component.__slots__.length = 0
            this.componentRendingStack.push(component)
            return instance()
          }
        }
        const self = this
        return {
          ...instance,
          $render(): JSXInternal.ViewNode {
            component.__slots__.forEach(i => self.renderedSlotCache.delete(i))
            component.__slots__.length = 0
            self.componentRendingStack.push(component)
            return instance.$render()
          }
        }
      })
    })
  }

  override copy() {
    document.execCommand('copy')
  }
}
