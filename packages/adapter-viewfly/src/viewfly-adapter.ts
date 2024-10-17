import { Component, CompositionState, makeError, VElement, ViewMount, VTextNode, merge } from '@textbus/core'
import {
  ComponentSetup,
  createDynamicRef,
  DynamicRef,
  getCurrentInstance,
  jsx,
  JSXNode,
  onUpdated,
  ViewFlyNode,
  withAnnotation,
} from '@viewfly/core'
import { DomAdapter } from '@textbus/platform-browser'

const adapterError = makeError('ViewflyDOMRenderer')

export interface ViewComponentProps<T extends Component> {
  component: T
  rootRef: DynamicRef<Element>
}

export interface ViewflyAdapterComponents {
  [key: string]: ComponentSetup<ViewComponentProps<any>>
}

export class ViewflyAdapter extends DomAdapter<ViewFlyNode, ViewFlyNode> {
  private components: ViewflyAdapterComponents = {}

  private componentRefs = new WeakMap<Component, DynamicRef<Element>>()

  constructor(components: ViewflyAdapterComponents,
              mount: ViewMount<ViewFlyNode, Element>
  ) {
    super({
      createCompositionNode(compositionState: CompositionState,
                            updateNativeCompositionNode: (nativeNode: (Element | null)) => void): VElement {
        const ref = createDynamicRef<Element>(node => {
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
        const ref = createDynamicRef<Element>(nativeNode => {
          update(nativeNode)
          return () => {
            update(null)
          }
        })
        if (currentRef instanceof DynamicRef) {
          vEle.attrs.set('ref', [currentRef, ref])
        } else if (Array.isArray(currentRef)) {
          currentRef.push(ref)
        } else {
          vEle.attrs.set('ref', ref)
        }
      },
      componentRender: (component: Component<any>): ViewFlyNode => {
        const comp = this.components[component.name] || this.components['*']
        if (comp) {
          let ref = this.componentRefs.get(component)
          if (!ref) {
            ref = createDynamicRef<Element>(rootNode => {
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
      vElementToViewElement(vNode: VElement, children: Array<JSXNode>): ViewFlyNode {
        const key = vNode.attrs.get('key')
        vNode.attrs.delete('key')
        const props: any = {
          ...(Array.from(vNode.attrs).reduce((a, b) => {
            a[b[0]] = b[1]
            return a
          }, {} as Record<string, any>)),
        }
        if (vNode.classes.size) {
          props.class = Array.from(vNode.classes).join(' ')
        }
        if (vNode.styles) {
          props.style = Array.from(vNode.styles).reduce((a, b) => {
            a[b[0]] = b[1]
            return a
          }, {} as Record<string, any>)
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
          textbusComponent.changeMarker.rendered()
          if (!this.componentRootElementCaches.get(textbusComponent)) {
            // eslint-disable-next-line max-len
            throw adapterError(`Component \`${textbusComponent.name}\` is not bound to rootRef, you must bind rootRef to the root element node of the component view.`)
          }
        })
        return viewFlyComponent(props)
      })
    })
  }

  override copy() {
    document.execCommand('copy')
  }
}
