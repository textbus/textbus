import { createDynamicRef, DynamicRef, getCurrentInstance, jsx, JSXNode, onUpdated } from '@viewfly/core'
import { merge, Subject } from '@tanbo/stream'
import { Component, invokeListener, makeError, replaceEmpty, Slot, VElement, VTextNode } from '@textbus/core'
import { CompositionState, DomAdapter } from '@textbus/platform-browser'

const adapterError = makeError('ViewflyAdapter')

export interface ViewComponentProps<T extends Component> {
  component: T
  rootRef: DynamicRef<HTMLElement>
}

export interface ViewflyAdapterComponents {
  [key: string]: JSXInternal.ComponentSetup<ViewComponentProps<any>>
}

/**
 * Textbus 桥接 [Viewfly](https://viewfly.org) 渲染能力适配器，用于在 Viewfly 项目中渲染 Textbus 数据
 */
export class Adapter extends DomAdapter<JSXNode, JSXInternal.Element> {
  onViewUpdated = new Subject<void>()

  private components: ViewflyAdapterComponents = {}

  private componentRefs = new WeakMap<Component, DynamicRef<HTMLElement>>()

  private componentRendingStack: Component[] = []

  constructor(components: ViewflyAdapterComponents,
              mount: (host: HTMLElement, root: JSXNode) => (void | (() => void))) {
    super(mount)
    let isRoot = true
    Object.keys(components).forEach(key => {
      this.components[key] = (props: ViewComponentProps<Component>) => {
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
          this.componentRendingStack.pop()
          textbusComponent.changeMarker.rendered()
          if (!this.componentRootElementCaches.get(textbusComponent)) {
            // eslint-disable-next-line max-len
            throw adapterError(`Component \`${textbusComponent.name}\` is not bound to rootRef, you must bind rootRef to the root element node of the component view.`)
          }
        })
        const component = props.component
        const instance = components[key](props)
        if (typeof instance === 'function') {
          return () => {
            component.__slots__.length = 0
            this.componentRendingStack.push(component)
            return instance()
          }
        }
        const self = this
        return {
          ...instance,
          $render(): JSXInternal.ViewNode {
            component.__slots__.length = 0
            self.componentRendingStack.push(component)
            return instance.$render()
          }
        }
      }
    })
  }

  componentRender(component: Component): JSXInternal.ViewNode {
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
  }

  slotRender(slot: Slot,
             slotHostRender: (children: Array<VElement | VTextNode | Component>) => VElement,
             renderEnv?: any): JSXInternal.Element {
    const context = this.componentRendingStack[this.componentRendingStack.length - 1]!
    context.__slots__.push(slot)
    const vElement = slot.toTree(slotHostRender, renderEnv)
    this.slotRootVElementCaches.set(slot, vElement)

    const vNodeToJSX = (vNode: VElement) => {
      const children: JSXInternal.ViewNode[] = []
      if (this.composition && this.composition.slot === slot) {
        this.insertCompositionByIndex(slot, vNode, this.composition)
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
    const jsxNode = vNodeToJSX(vElement)
    const currentRef = jsxNode.props.ref
    const ref = createDynamicRef<HTMLElement>(nativeNode => {
      this.slotRootNativeElementCaches.set(slot, nativeNode)
      return () => {
        this.slotRootNativeElementCaches.remove(slot)
      }
    })
    if (currentRef instanceof DynamicRef) {
      jsxNode.props.ref = [currentRef, ref]
    } else if (Array.isArray(currentRef)) {
      currentRef.push(ref)
    } else {
      jsxNode.props.ref = ref
    }
    slot.changeMarker.rendered()
    return jsxNode
  }

  private insertCompositionByIndex(slot: Slot, vNode: VElement, composition: CompositionState) {
    const location = vNode.location
    const nodes = vNode.children

    if (location && location.slot === composition.slot) {
      for (let i = 0; i < nodes.length; i++) {
        const child = nodes[i]
        if (child instanceof VTextNode) {
          const childLocation = child.location
          if (childLocation) {
            if (composition.index > childLocation.startIndex && composition.index <= childLocation.endIndex) {
              const compositionNode = this.createCompositionNode(composition)
              if (composition.index === childLocation.endIndex) {
                nodes.splice(i + 1, 0, compositionNode)
                break
              }
              const splitIndex = composition.index - childLocation.startIndex
              const beforeNode = new VTextNode(child.textContent.slice(0, splitIndex))
              beforeNode.location = {
                slot: childLocation.slot,
                startIndex: childLocation.startIndex,
                endIndex: childLocation.startIndex + splitIndex
              }

              const afterNode = new VTextNode(child.textContent.slice(splitIndex))
              afterNode.location = {
                slot: childLocation.slot,
                startIndex: composition.index,
                endIndex: childLocation.endIndex
              }
              nodes.splice(i, 1, beforeNode, compositionNode, afterNode)
              break
            } else if (composition.index === 0 && childLocation.startIndex === 0) {
              nodes.unshift(this.createCompositionNode(composition))
              break
            }
          }
        } else if (child instanceof Component) {
          const componentIndex = slot.indexOf(child)
          if (composition.index === componentIndex + 1) {
            nodes.splice(i + 1, 0, this.createCompositionNode(composition))
            break
          } else if (componentIndex === 0 && composition.index === 0) {
            nodes.unshift(this.createCompositionNode(composition))
            break
          }
        } else if (child.tagName === 'br') {
          const location = child.location
          if (location) {
            if (location.endIndex === composition.index) {
              nodes.splice(i + 1, 0, this.createCompositionNode(composition))
              break
            } else if (location.startIndex === 0 && composition.index === 0) {
              nodes.unshift(this.createCompositionNode(composition))
              break
            }
          }
        }
      }
    }
  }

  private createCompositionNode(composition: CompositionState) {
    const ref = createDynamicRef<HTMLElement>(node => {
      this.compositionNode = node
      return () => {
        this.compositionNode = null
      }
    })
    return new VElement('span', {
      style: {
        textDecoration: 'underline'
      },
      ref
    }, [
      new VTextNode(composition.text)
    ])
  }
}
