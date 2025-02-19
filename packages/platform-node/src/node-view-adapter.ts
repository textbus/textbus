import { Component, CompositionState, makeError, VElement, ViewMount, Adapter, VTextNode, merge, Subject } from '@textbus/core'
import { VDOMElement, VDOMText } from '@viewfly/platform-browser'
import {
  ComponentSetup,
  createDynamicRef,
  DynamicRef,
  getCurrentInstance,
  jsx,
  JSX,
  JSXNode, onUnmounted,
  onUpdated,
} from '@viewfly/core'

export interface ViewVDomComponentProps<T extends Component> {
  component: T
  rootRef: DynamicRef<VDOMElement>
}

export interface ViewflyVDomAdapterComponents {
  [key: string]: ComponentSetup<ViewVDomComponentProps<any>>
}

const adapterError = makeError('ViewflyHTMLRenderer')

export class NodeViewAdapter extends Adapter<VDOMElement, VDOMText, JSX.Element, JSX.Element> {
  onViewUpdated = new Subject<void>()
  host = new VDOMElement('body')
  private components: ViewflyVDomAdapterComponents = {}

  private componentRefs = new WeakMap<Component, DynamicRef<VDOMElement>>()

  constructor(components: ViewflyVDomAdapterComponents,
              mount: ViewMount<JSX.Element, VDOMElement>
  ) {
    super({
      createCompositionNode(compositionState: CompositionState,
                            updateNativeCompositionNode: (nativeNode: (VDOMElement | null)) => void): VElement {
        const ref = createDynamicRef<VDOMElement>(node => {
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
      getParentNode(node: VDOMElement | VDOMText): VDOMElement | null {
        return node.parent
      },
      getChildNodes(parentElement: VDOMElement): Array<VDOMElement | VDOMText> {
        return parentElement.children.slice()
      },
      isNativeElementNode(node: VDOMElement | VDOMText): node is VDOMElement {
        return node instanceof VDOMElement
      },
      getChildByIndex(parentElement, index) {
        return parentElement.children[index] as VDOMElement
      },
      getAndUpdateSlotRootNativeElement(vEle: VElement, update: (nativeElement: (VDOMElement | null)) => void) {
        const currentRef = vEle.attrs.get('ref')
        const ref = createDynamicRef<VDOMElement>(nativeNode => {
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
      componentRender: (component: Component<any>): JSX.Element => {
        const comp = this.components[component.name] || this.components['*']
        if (comp) {
          let ref = this.componentRefs.get(component)
          if (!ref) {
            ref = createDynamicRef<VDOMElement>(rootNode => {
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
      vElementToViewElement(vNode: VElement, children: Array<JSXNode>): JSX.Element {
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
      this.components[key] = (props: ViewVDomComponentProps<Component>) => {
        const comp = getCurrentInstance()
        const textbusComponent = props.component
        const subscription = merge(textbusComponent.changeMarker.onChange,
          textbusComponent.changeMarker.onForceChange).subscribe(() => {
          if (textbusComponent.changeMarker.dirty) {
            comp.markAsDirtied()
          }
        })
        onUnmounted(() => {
          subscription.unsubscribe()
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
      }
    })
  }

  override copy() {
    document.execCommand('copy')
  }
}
