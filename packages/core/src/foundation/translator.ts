import { Injectable, Injector } from '@tanbo/di'

import {
  Component, ComponentData,
  ComponentInstance,
  ComponentLiteral,
  FormatType,
  Slot,
  SlotLiteral
} from '../model/_api'
import { Registry } from './registry'

/**
 * Textbus 数据转组件和插槽的类
 */
@Injectable()
export class Translator {
  constructor(private contextInjector: Injector,
              private registry: Registry) {
  }

  createComponentByData(name: string, data: ComponentData) {
    const factory = this.registry.getComponent(name)
    if (factory) {
      return factory.createInstance(this.contextInjector, data)
    }
    return null
  }

  /**
   * 根据插槽数据生成插槽实例
   * @param slotLiteral
   * @param customComponentCreator
   */
  createSlot(slotLiteral: SlotLiteral,
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
                  customSlotCreator?: (slotLiteral: SlotLiteral, index: number) => Slot): ComponentInstance | null {
    const factory = this.registry.getComponent(componentLiteral.name)
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
                           customSlotCreator?: (slotLiteral: SlotLiteral, index: number) => Slot) {
    const slots = componentLiteral.slots.map(customSlotCreator || ((i) => this.createSlot(i)))
    return factory.createInstance(this.contextInjector, {
      state: componentLiteral.state,
      slots
    })
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
      const formatter = this.registry.getFormatter(key)
      if (formatter) {
        if (formatter.type === FormatType.Block) {
          slotLiteral.formats[key].forEach(i => {
            slot.retain(0)
            slot.retain(slot.length, formatter, i.value)
          })
          return
        }
        slotLiteral.formats[key].forEach(i => {
          slot.retain(i.startIndex)
          slot.retain(i.endIndex - i.startIndex, formatter, i.value)
        })
      }
    })

    return slot
  }
}
