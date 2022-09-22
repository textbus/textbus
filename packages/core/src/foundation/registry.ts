import { Inject, Injectable, Injector, Optional } from '@tanbo/di'
import {
  Component,
  ComponentInitData,
  ComponentInstance,
  ComponentLiteral,
  Formatter,
  FormatType,
  Slot,
  SlotLiteral
} from '../model/_api'
import { COMPONENT_LIST, FORMATTER_LIST } from './_injection-tokens'

export abstract class FactoryFallback {
  abstract getComponent(name: string): Component | null

  abstract getFormatter(name: string): Formatter | null

  abstract createComponentByData(name: string, data: ComponentInitData): ComponentInstance | null
}

@Injectable()
export class Registry {
  private componentMap = new Map<string, Component>()
  private formatMap = new Map<string, Formatter>()

  constructor(private contextInjector: Injector,
              @Inject(COMPONENT_LIST) private components: Component[],
              @Inject(FORMATTER_LIST) private formatters: Formatter[],
              @Optional() private factoryFallback?: FactoryFallback) {
    components.reverse().forEach(f => {
      this.componentMap.set(f.name, f)
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
    return this.componentMap.get(name) || this.factoryFallback?.getComponent(name) || null
  }

  /**
   * 根据格式名获取格式
   * @param name 格式名
   */
  getFormatter(name: string) {
    return this.formatMap.get(name) || this.factoryFallback?.getFormatter(name) || null
  }

  /**
   * 根据组件名和数据创建组件
   * @param name
   * @param data
   */
  createComponentByData(name: string, data: ComponentInitData) {
    const factory = this.getComponent(name)
    if (factory) {
      return factory.createInstance(this.contextInjector, data)
    }
    return this.factoryFallback?.createComponentByData(name, data) || null
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
      const formatter = this.getFormatter(key)
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
