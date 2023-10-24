import { Inject, Injectable } from '@viewfly/core'
import {
  Attribute,
  Component,
  ComponentInitData,
  ComponentInstance,
  ComponentLiteral,
  Formatter,
  Slot,
  SlotLiteral
} from '../model/_api'
import { ATTRIBUTE_LIST, COMPONENT_LIST, FORMATTER_LIST } from './_injection-tokens'
import { Textbus } from '../textbus'

/**
 * 注册表
 * 用于缓存一个 Textbus 实例内可用的 Component、Formatter、Attribute。
 * Registry 也可以根据数据创建组件或插槽的实例
 */
@Injectable()
export class Registry {
  private componentMap = new Map<string, Component>()
  private formatMap = new Map<string, Formatter<any>>()
  private attributeMap = new Map<string, Attribute<any>>()

  constructor(public textbus: Textbus,
              @Inject(COMPONENT_LIST) components: Component[],
              @Inject(ATTRIBUTE_LIST) attributes: Attribute<any>[],
              @Inject(FORMATTER_LIST) formatters: Formatter<any>[]) {
    components.reverse().forEach(f => {
      this.componentMap.set(f.name, f)
    })
    attributes.reverse().forEach(f => {
      this.attributeMap.set(f.name, f)
    })
    formatters.reverse().forEach(f => {
      this.formatMap.set(f.name, f)
    })
  }

  /**
   * 根据组件名获取组件
   * @param name 组件名
   */
  getComponent(name: string) {
    return this.componentMap.get(name) || null
  }

  /**
   * 根据格式名获取格式
   * @param name 格式名
   */
  getFormatter(name: string) {
    return this.formatMap.get(name) || null
  }

  /**
   * 根据名字获取 Attribute 实例
   * @param name
   */
  getAttribute(name: string) {
    return this.attributeMap.get(name) || null
  }

  /**
   * 根据组件名和数据创建组件
   * @param name
   * @param data
   */
  createComponentByData(name: string, data: ComponentInitData) {
    const factory = this.getComponent(name)
    if (factory) {
      return factory.createInstance(this.textbus, data)
    }
    return null
  }

  /**
   * 根据插槽数据生成插槽实例
   * @param slotLiteral
   * @param customComponentCreator
   */
  createSlot(slotLiteral: SlotLiteral<any, any>,
             customComponentCreator?: (componentLiteral: ComponentLiteral, index: number) => ComponentInstance): Slot {
    const slot = new Slot(slotLiteral.schema, slotLiteral.state)
    return this.loadSlot(slot, slotLiteral, customComponentCreator)
  }

  /**
   * 根据组件数据生成组件实例
   * @param componentLiteral
   * @param customSlotCreator
   */
  createComponent(componentLiteral: ComponentLiteral,
                  customSlotCreator?: (slotLiteral: SlotLiteral<any, any>, index: number) => Slot): ComponentInstance | null {
    const factory = this.getComponent(componentLiteral.name)
    if (factory) {
      return this.createComponentByFactory(componentLiteral, factory, customSlotCreator)
    }
    return null
  }

  /**
   * 指定组件创建实例
   * @param componentLiteral
   * @param factory
   * @param customSlotCreator
   */
  createComponentByFactory(componentLiteral: ComponentLiteral,
                           factory: Component,
                           customSlotCreator?: (slotLiteral: SlotLiteral<any, any>, index: number) => Slot) {
    const slots = componentLiteral.slots.map(customSlotCreator || ((i) => this.createSlot(i)))
    return factory.createInstance(this.textbus, {
      state: componentLiteral.state,
      slots
    })
  }

  /**
   * 将插槽数据填充到指定的插槽
   * @param source
   * @param target
   */
  fillSlot<T extends SlotLiteral<any, any>, U extends Slot>(source: T, target: U): U {
    return this.loadSlot(target, source)
  }

  private loadSlot<T extends SlotLiteral<any, any>, U extends Slot>(
    slot: U,
    slotLiteral: T,
    customComponentCreator?: (componentLiteral: ComponentLiteral, index: number) => ComponentInstance): U {
    slotLiteral.content.forEach((item, index) => {
      if (typeof item !== 'string') {
        const component = customComponentCreator ? customComponentCreator(item, index) : this.createComponent(item)
        if (component) {
          slot.insert(component)
        }
        return
      }
      slot.insert(item)
    })

    Object.keys(slotLiteral.formats).forEach(key => {
      const formatter = this.getFormatter(key)
      if (formatter) {
        slotLiteral.formats[key].forEach(i => {
          slot.retain(i.startIndex)
          slot.retain(i.endIndex - i.startIndex, formatter, i.value)
        })
      }
    })

    if (slotLiteral.attributes !== null && typeof slotLiteral.attributes === 'object') {
      Object.keys(slotLiteral.attributes).forEach(key => {
        const attribute = this.attributeMap.get(key)
        if (attribute) {
          slot.setAttribute(attribute, slotLiteral.attributes[key])
        }
      })
    }

    return slot
  }
}
