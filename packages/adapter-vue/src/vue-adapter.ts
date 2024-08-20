import { Component, CompositionState, makeError, VElement, ViewMount, VTextNode } from '@textbus/core'
import { DefineComponent, getCurrentInstance, h, onMounted, onUnmounted, onUpdated, ref, Ref, VNode } from 'vue'
import { DomAdapter } from '@textbus/platform-browser'

const adapterError = makeError('VueAdapter')

export interface ViewComponentProps<T extends Component> {
  component: T
  rootRef: Ref<HTMLElement | undefined>
}

export interface VueAdapterComponents {
  [key: string]: DefineComponent<ViewComponentProps<any>>
}

export class VueAdapter extends DomAdapter<VNode, VNode> {
  // private compositionRef = ref<HTMLElement>()
  private componentRefs = new WeakMap<Component, Ref<HTMLElement | undefined>>()
  private components: Record<string, DefineComponent<ViewComponentProps<any>>> = {}

  constructor(components: VueAdapterComponents,
              mount: ViewMount<VNode, HTMLElement>) {
    super({
      createCompositionNode: (compositionState: CompositionState,
                              updateNativeCompositionNode: (nativeNode: (HTMLElement | null)) => void): VElement => {
        return new VElement('span', {
          style: {
            textDecoration: 'underline'
          },
          ref: updateNativeCompositionNode
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
      getAndUpdateSlotRootNativeElement(vElement: VElement, update: (nativeElement: (HTMLElement | null)) => void) {
        const currentRef = vElement.attrs.get('ref')
        if (currentRef) {
          vElement.attrs.set('ref', (v: HTMLElement) => {
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
            rootRef = ref<HTMLElement>()
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
        const sub = component.changeMarker.onChange.subscribe(() => {
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
          const context = self.componentRendingStack[self.componentRendingStack.length - 1]!
          if (context === component) {
            self.componentRendingStack.pop()
          }
          component.changeMarker.rendered()
          self.onViewUpdated.next()

          if (!(self.componentRefs.get(component)?.value instanceof HTMLElement)) {
            // eslint-disable-next-line max-len
            throw adapterError(`Component \`${component.name}\` is not bound to rootRef, you must bind rootRef to the root element node of the component view.`)
          }
        })
        onUnmounted(() => {
          sub.unsubscribe()
        })
        const result = (setup as any)(props, context, ...args)
        if (typeof result === 'function') {
          return function (this: any, ...args: any[]) {
            component.__slots__.length = 0
            self.componentRendingStack.push(component)
            return result.apply(this, args)
          }
        }
        return result
      }

      if (vueComponent.render) {
        const oldRender = vueComponent.render
        vueComponent.render = function (context: any, ...args: any[]) {
          context.component.__slots__.length = 0
          self.componentRendingStack.push(context.component)

          return oldRender.apply(this, [context, ...args])
        }
      }
      this.components[key] = vueComponent
    })
  }

  override copy() {
    document.execCommand('copy')
  }
}
