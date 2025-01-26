import { Adapter, Component, CompositionState, makeError, VElement, ViewMount, VTextNode } from '@textbus/core'
import { DefineComponent, getCurrentInstance, h, onMounted, onUnmounted, onUpdated, ref, Ref, VNode } from 'vue'
import { DomAdapter } from '@textbus/platform-browser'
import { Injector, ReflectiveInjector } from '@viewfly/core'
import { merge } from '@tanbo/stream'

const adapterError = makeError('VueAdapter')

export interface ViewComponentProps<T extends Component> {
  component: T
  rootRef: Ref<Element | undefined>
}

export interface VueAdapterComponents {
  [key: string]: DefineComponent<ViewComponentProps<any>>
}

export class VueAdapter extends DomAdapter<VNode, VNode> {
  // private compositionRef = ref<Element>()
  private componentRefs = new WeakMap<Component, Ref<Element | undefined>>()
  private components: Record<string, DefineComponent<ViewComponentProps<any>>> = {}

  constructor(components: VueAdapterComponents,
              mount: ViewMount<VNode, Element>) {
    super({
      createCompositionNode: (compositionState: CompositionState,
                              updateNativeCompositionNode: (nativeNode: (Element | null)) => void): VElement => {
        return new VElement('span', {
          style: {
            textDecoration: 'underline'
          },
          ref: updateNativeCompositionNode
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
      getAndUpdateSlotRootNativeElement(vElement: VElement, update: (nativeElement: (Element | null)) => void) {
        const currentRef = vElement.attrs.get('ref')
        if (currentRef) {
          vElement.attrs.set('ref', (v: Element) => {
            update(v)
            if (typeof currentRef === 'function') {
              currentRef(v)
            } else if (!currentRef.value) {
              currentRef.value = v
            }
          })
        } else {
          vElement.attrs.set('ref', update)
        }
      },
      componentRender: (component: Component<any>): VNode => {
        const comp = this.components[component.name] || this.components['*']
        if (comp) {
          let rootRef = this.componentRefs.get(component)
          if (!rootRef) {
            rootRef = ref<Element>()
            this.componentRefs.set(component, rootRef)
          }
          return h(comp, {
            component,
            rootRef,
            key: component.id
          })
        }
        throw adapterError(`cannot found view component \`${component.name}\`!`)
      },
      vElementToViewElement(vNode: VElement, children: Array<string | VNode>): VNode {
        const props: any = {
          ...(Array.from(vNode.attrs).reduce((a, b) => {
            a[b[0]] = b[1]
            return a
          }, {} as Record<string, any>))
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
        return h(vNode.tagName, props, ...children)
      }
    }, mount)

    // watchEffect(() => {
    //   this.compositionNode = this.compositionRef.value || null
    // })

    Object.keys(components).forEach(key => {
      const vueComponent = components[key]
      const setup = vueComponent.setup!
      const self = this
      vueComponent.setup = function (props: ViewComponentProps<Component>, context, ...args: any[]) {
        const component = props.component
        const vueInstance = getCurrentInstance()!
        const sub = merge(component.changeMarker.onChange, component.changeMarker.onForceChange).subscribe(() => {
          if (component.changeMarker.dirty) {
            vueInstance.proxy!.$forceUpdate()
          }
        })
        onMounted(() => {
          if (props.rootRef.value) {
            self.componentRootElementCaches.set(component, props.rootRef.value)
          } else {
            self.componentRootElementCaches.remove(component)
          }
        })
        onUpdated(() => {
          component.changeMarker.rendered()
          self.onViewUpdated.next()

          if (!(self.componentRefs.get(component)?.value instanceof Element)) {
            // eslint-disable-next-line max-len
            throw adapterError(`Component \`${component.name}\` is not bound to rootRef, you must bind rootRef to the root element node of the component view.`)
          }
        })
        onUnmounted(() => {
          sub.unsubscribe()
        })
        return (setup as any)(props, context, ...args)
      }
      this.components[key] = vueComponent
    })
  }

  override render(rootComponent: Component, injector: Injector): void | (() => void) {
    const childrenInjector = new ReflectiveInjector(injector, [{
      provide: Adapter,
      useValue: this
    }, {
      provide: DomAdapter,
      useValue: this,
    }, {
      provide: VueAdapter,
      useValue: this
    }])
    return super.render(rootComponent, childrenInjector)
  }

  override copy() {
    document.execCommand('copy')
  }
}
