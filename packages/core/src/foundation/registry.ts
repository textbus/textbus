import { Inject, Injectable } from '@viewfly/core'
import {
  Attribute,
  ComponentConstructor,
  Component,
  ComponentLiteral,
  Formatter,
  Slot,
  SlotLiteral, AsyncSlotLiteral, AsyncSlot, AsyncComponentLiteral
} from '../model/_api'
import { ATTRIBUTE_LIST, COMPONENT_LIST, FORMATTER_LIST } from './_injection-tokens'
import { Textbus } from '../textbus'
import { makeError } from '../_utils/make-error'

const registryErrorFn = makeError('Registry')

function isAsyncSlotLiteral(slotLiteral: SlotLiteral): slotLiteral is AsyncSlotLiteral {
  return (slotLiteral as any).async === true
}

/**
 * 注册表
 * 用于缓存一个 Textbus 实例内可用的 Component、Formatter、Attribute。
 * Registry 也可以根据数据创建组件或插槽的实例
 */
@Injectable()
export class Registry {
  private componentMap = new Map<string, ComponentConstructor>()
  private formatMap = new Map<string, Formatter<any>>()
  private attributeMap = new Map<string, Attribute<any>>()

  constructor(public textbus: Textbus,
              @Inject(COMPONENT_LIST) components: ComponentConstructor[],
              @Inject(ATTRIBUTE_LIST) attributes: Attribute<any>[],
              @Inject(FORMATTER_LIST) formatters: Formatter<any>[]) {
    components.reverse().forEach(f => {
      this.componentMap.set(f.componentName, f)
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
  createComponentByData(name: string, data: any) {
    const factory = this.getComponent(name)
    if (factory) {
      return new factory(this.textbus, data)
    }
    return null
  }

  /**
   * 根据插槽数据生成插槽实例
   * @param slotLiteral
   */
  createSlot(slotLiteral: AsyncSlotLiteral): AsyncSlot
  createSlot(slotLiteral: SlotLiteral): Slot
  createSlot(slotLiteral: SlotLiteral | AsyncSlotLiteral): Slot | AsyncSlot {
    if (isAsyncSlotLiteral(slotLiteral)) {
      return new AsyncSlot(slotLiteral.schema, slotLiteral.metadata)
    }
    const slot = new Slot(slotLiteral.schema)
    return this.loadSlot(slot, slotLiteral)
  }

  /**
   * 根据组件数据生成组件实例
   * @param componentLiteral
   */
  createComponent(componentLiteral: ComponentLiteral | AsyncComponentLiteral): Component | null {
    const factory = this.getComponent(componentLiteral.name)
    if (factory) {
      return this.createComponentByFactory(componentLiteral, factory)
    }
    return null
  }

  /**
   * 指定组件创建实例
   * @param componentLiteral
   * @param factory
   */
  createComponentByFactory(componentLiteral: ComponentLiteral | AsyncComponentLiteral,
                           factory: ComponentConstructor) {
    if (typeof factory.fromJSON === 'function') {
      return factory.fromJSON(this.textbus, componentLiteral.state, (componentLiteral as any).metadata)
    }
    throw registryErrorFn(`Component ${factory.componentName} does not implement the fromJSON method.`)
  }

  /**
   * 将插槽数据填充到指定的插槽
   * @param source
   * @param target
   */
  fillSlot<T extends SlotLiteral, U extends Slot>(source: T, target: U): U {
    return this.loadSlot(target, source)
  }

  private loadSlot<T extends SlotLiteral, U extends Slot>(
    slot: U,
    slotLiteral: T): U {
    slotLiteral.content.forEach((item) => {
      if (typeof item !== 'string') {
        const component = this.createComponent(item)
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
