import { jsx, JSXComponent, JSXInternal, JSXNode, onUpdated, provide, Ref, useRef } from '@viewfly/core'
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

const adapterError = makeError('ViewflyAdapter')

export interface ViewComponentProps<T extends Component = Component> {
  component: ExtractComponentInstanceType<T>
  rootRef: Ref<HTMLElement>
}

export interface ViewflyAdapterComponents {
  [key: string]: JSXInternal.ComponentSetup<ViewComponentProps>
}

export class Adapter extends DomAdapter<JSXComponent, JSXInternal.Element> {
  onViewUpdated = new Subject<void>()

  private components: ViewflyAdapterComponents = {}

  constructor(components: ViewflyAdapterComponents,
              mount: (host: HTMLElement, root: JSXComponent) => (void | (() => void))) {
    super(mount)
    let isRoot = true
    Object.keys(components).forEach(key => {
      this.components[key] = (props: ViewComponentProps) => {
        const comp = provide([])
        const textbusComponent = props.component
        textbusComponent.changeMarker.onChange.subscribe(() => {
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
        })

        return components[key](props)
      }
    })
  }

  componentRender(component: ComponentInstance): JSXInternal.JSXNode {
    const comp = this.components[component.name] || this.components['*']
    if (comp) {
      return jsx(comp, {
        component,
        rootRef: useRef<HTMLElement>(rootNode => {
          this.componentRootElementCaches.set(component, rootNode)
          return () => {
            this.componentRootElementCaches.delete(component)
          }
        })
      }, component.id)
    }
    throw adapterError(`cannot found view component \`${component.name}\`!`)
  }

  slotRender(slot: Slot, slotHostRender: (children: Array<VElement | VTextNode | ComponentInstance>) => VElement): JSXInternal.Element {
    const vElement = slot.toTree(slotHostRender)
    this.slotRootVElementCaches.set(slot, vElement)

    const vNodeToJSX = (vNode: VElement) => {
      const children: JSXNode[] = []

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
        }, {})),
        children,
        class: Array.from(vNode.classes).join(' '),
        style: Array.from(vNode.styles).reduce((a, b) => {
          a[b[0]] = b[1]
          return a
        }, {})
      }
      return jsx(vNode.tagName, props)
    }
    const jsxNode = vNodeToJSX(vElement)
    const currentRef = jsxNode.props.ref
    const ref = useRef<HTMLElement>(nativeNode => {
      this.slotRootNativeElementCaches.set(slot, nativeNode)
    })
    if (currentRef instanceof Ref) {
      jsxNode.props.ref = [currentRef, ref]
    } else if (Array.isArray(currentRef)) {
      currentRef.push(ref)
    } else {
      jsxNode.props.ref = ref
    }
    slot.changeMarker.rendered()
    return jsxNode
  }
}
