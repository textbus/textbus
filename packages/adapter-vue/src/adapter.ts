import { DefineComponent, getCurrentInstance, h, onMounted, onUnmounted, onUpdated, Ref, ref, VNode, watchEffect } from 'vue'
import { Subject } from '@tanbo/stream'
import { Component, invokeListener, makeError, replaceEmpty, Slot, VElement, VTextNode } from '@textbus/core'
import { DomAdapter } from '@textbus/platform-browser'

const adapterError = makeError('VueAdapter')

export interface ViewComponentProps<T extends Component> {
  component: T
  rootRef: Ref<HTMLElement | undefined>
}

export interface VueAdapterComponents {
  [key: string]: DefineComponent<ViewComponentProps<any>>
}

/**
 * Textbus 桥接 Vue 渲染能力适配器，用于在 Vue 项目中渲染 Textbus 数据
 */
export class Adapter extends DomAdapter<VNode, VNode> {
  onViewUpdated = new Subject<void>()

  private components: Record<string, DefineComponent<ViewComponentProps<any>>> = {}
  private componentRefs = new WeakMap<Component, Ref<HTMLElement | undefined>>()
  private componentRendingStack: Component[] = []

  private compositionRef = ref<HTMLElement>()

  constructor(components: VueAdapterComponents,
              mount: (host: HTMLElement, root: VNode) => (void | (() => void))) {
    super(mount)

    watchEffect(() => {
      this.compositionNode = this.compositionRef.value || null
    })

    Object.keys(components).forEach(key => {
      const vueComponent = components[key]
      const setup = vueComponent.setup!
      const self = this
      vueComponent.setup = function (props: ViewComponentProps<Component>) {
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
        const result = (setup as any)(props)
        if (typeof result === 'function') {
          return function () {
            component.__slots__.forEach(i => self.renderedSlotCache.delete(i))
            component.__slots__.length = 0
            self.componentRendingStack.push(component)
            return result()
          }
        }
        return result
      }

      if (vueComponent.render) {
        const oldRender = vueComponent.render
        vueComponent.render = function (context: any) {
          context.component.__slots__.length = 0
          self.componentRendingStack.push(context.component)

          oldRender.apply(this, context)
        }
      }
      this.components[key] = vueComponent
    })
  }

  componentRender(component: Component): VNode {
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
  }

  slotRender(slot: Slot,
             slotHostRender: (children: Array<VElement | VTextNode | Component>) => VElement,
             renderEnv?: any): VNode {
    const context = this.componentRendingStack[this.componentRendingStack.length - 1]!
    if (context) {
      context.__slots__.push(slot)
    } else if (!this.renderedSlotCache.has(slot)) {
      throw adapterError(`Unrendered slots must be rendered together with the corresponding "${slot.parent?.name || 'unknown'}" component`)
    }
    this.renderedSlotCache.set(slot, true)

    const vElement = slot.toTree(slotHostRender, renderEnv)
    this.slotRootVElementCaches.set(slot, vElement)

    const vNodeToJSX = (vNode: VElement) => {
      const children: Array<VNode | string> = []
      if (this.composition && this.composition.slot === slot) {
        this.insertCompositionByIndex(slot, vNode, this.composition, () => {
          return new VElement('span', {
            style: {
              textDecoration: 'underline'
            },
            ref: this.compositionRef
          }, [
            new VTextNode(this.composition!.text)
          ])
        })
      }
      for (let i = 0; i < vNode.children.length; i++) {
        const child = vNode.children[i]
        if (child instanceof VElement) {
          children.push(vNodeToJSX(child))
        } else if (child instanceof VTextNode) {
          children.push(replaceEmpty(child.textContent))
        } else {
          children.push(this.componentRender(child))
          if (!this.firstRending) {
            invokeListener(child, 'onParentSlotUpdated')
          }
        }
      }
      const props: any = {
        ...(Array.from(vNode.attrs).reduce((a, b) => {
          a[b[0]] = b[1]
          return a
        }, {}))
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
      return h(vNode.tagName, props, ...children)
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
        } else if (!currentRef.value) {
          currentRef.value = v
        }
      })
    } else {
      vElement.attrs.set('ref', refFn)
    }

    slot.__changeMarker__.rendered()
    return vNodeToJSX(vElement)
  }
}
