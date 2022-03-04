import { Injectable, Injector } from '@tanbo/di'

import {
  Component,
  ComponentInstance,
  ComponentLiteral,
  FormatType,
  Slot,
  SlotLiteral
} from '../model/_api'
import { FormatterList } from './formatter-list'
import { ComponentList } from './component-list'

/**
 * TextBus 数据转组件和插槽的类
 */
@Injectable()
export class Translator {
  constructor(private contextInjector: Injector,
              private componentMap: ComponentList,
              private formatterMap: FormatterList) {
  }

  /**
   * 根据插槽数据生成插槽实例
   * @param slotLiteral
   */
  createSlot(slotLiteral: SlotLiteral): Slot {
    const slot = new Slot(slotLiteral.schema, slotLiteral.state)
    return this.loadSlot(slot, slotLiteral)
  }

  /**
   * 根据组件数据生成组件实例
   * @param componentLiteral
   */
  createComponent(componentLiteral: ComponentLiteral): ComponentInstance | null {
    const factory = this.componentMap.get(componentLiteral.name)
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
  createComponentByFactory(componentLiteral: ComponentLiteral, factory: Component) {
    const slots = componentLiteral.slots.map(i => this.createSlot(i))
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

  private loadSlot<T extends SlotLiteral, U extends Slot>(slot: U, slotLiteral: T): U {
    slotLiteral.content.forEach(i => {
      if (typeof i !== 'string') {
        const component = this.createComponent(i)
        if (component) {
          slot.insert(component)
        }
        return
      }
      slot.insert(i)
    })

    Object.keys(slotLiteral.formats).forEach(key => {
      const formatter = this.formatterMap.get(key)
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
          slot.retain(i.endIndex, formatter, i.value)
        })
      }
    })

    return slot
  }
}
