import { DefineComponent, getCurrentInstance, h, onMounted, onUnmounted, onUpdated, Ref, ref, VNode } from 'vue'
import { Subject } from '@tanbo/stream'
import {
  Component,
  ComponentInstance,
  ExtractComponentInstanceType,
  makeError,
  replaceEmpty,
  Slot,
  VElement,
  VTextNode
} from '@textbus/core'
import { DomAdapter } from '@textbus/platform-browser'

const adapterError = makeError('VueAdapter')

export interface ViewComponentProps<T extends Component = Component> {
  component: ExtractComponentInstanceType<T>
  rootRef: Ref<HTMLElement | undefined>
}

export interface ReactAdapterComponents {
  [key: string]: DefineComponent<ViewComponentProps>
}

/**
 * Textbus 桥接 Vue 渲染能力适配器，用于在 Vue 项目中渲染 Textbus 数据
 */
export class Adapter extends DomAdapter<VNode, VNode> {
  onViewUpdated = new Subject<void>()

  private components: Record<string, DefineComponent<ViewComponentProps>> = {}
  private componentRefs = new WeakMap<ComponentInstance, Ref<HTMLElement | undefined>>()

  constructor(components: ReactAdapterComponents,
              mount: (host: HTMLElement, root: VNode) => (void | (() => void))) {
    super(mount)


    Object.keys(components).forEach(key => {
      const vueComponent = components[key]
      const setup = vueComponent.setup!
      const self = this
      vueComponent.setup = function (props: ViewComponentProps) {
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
          component.changeMarker.rendered()
          self.onViewUpdated.next()
        })
        onUnmounted(() => {
          sub.unsubscribe()
        })
        return (setup as any)(props)
      }
      this.components[key] = vueComponent
    })
  }

  componentRender(component: ComponentInstance): VNode {
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
             slotHostRender: (children: Array<VElement | VTextNode | ComponentInstance>) => VElement,
             renderEnv?: any): VNode {
    const vElement = slot.toTree(slotHostRender, renderEnv)
    this.slotRootVElementCaches.set(slot, vElement)

    const vNodeToJSX = (vNode: VElement) => {
      const children: Array<VNode | string> = []

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
        this.slotRootNativeElementCaches.remove(nativeNode)
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

    slot.changeMarker.rendered()
    return vNodeToJSX(vElement)
  }
}
