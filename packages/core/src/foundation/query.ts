import { Injectable } from '@viewfly/core'

import { Selection } from './selection'
import {
  Component,
  Formatter,
  FormatValue,
  Slot,
  ComponentConstructor,
  Attribute,
  SlotRange, State
} from '../model/_api'

/**
 * Textbus 状态查询状态枚举
 */
export enum QueryStateType {
  /** 正常 */
  Normal = 'Normal',
  /** 当前不可用 */
  Disabled = 'Disabled',
  /** 当前状态为生效 */
  Enabled = 'Enabled'
}

/**
 * Textbus 状态查询结果，当状态为 Normal，`value` 为 null
 */
export interface QueryState<V, S = QueryStateType, K = S extends QueryStateType.Enabled ? V : null> {
  state: S
  value: K
}

/**
 * Textbus 状态查询类，用于查询组件或格式在当前选区的状态
 */
@Injectable()
export class Query {
  constructor(private selection: Selection) {
  }

  /**
   * 查询格式在当前选区的状态
   * @param formatter 要查询的格式
   */
  queryFormat<T extends FormatValue>(formatter: Formatter<T>): QueryState<T> {
    if (!this.selection.isSelected) {
      return {
        state: QueryStateType.Normal,
        value: null
      }
    }
    const states = this.selection.getSelectedScopes().map(i => {
      return this.getStatesByRange(i.slot, formatter, i.startIndex, i.endIndex)
    })
    return this.mergeState(states)
  }

  /**
   * 查询属性在当前选区的状态
   * @param attribute
   */
  queryAttribute<T extends FormatValue>(attribute: Attribute<T>): QueryState<T> {
    if (!this.selection.isSelected) {
      return {
        state: QueryStateType.Normal,
        value: null
      }
    }

    let ranges: SlotRange[]

    if (this.selection.isCollapsed) {
      const c = this.selection.commonAncestorSlot!
      ranges = [{
        slot: c,
        startIndex: 0,
        endIndex: c.length
      }]
    } else {
      ranges = this.selection.getSelectedScopes()
    }
    const states = ranges.map(i => {
      const contents = i.slot.sliceContent(i.startIndex, i.endIndex)
      const childComponents: Component[] = []
      let hasString = false
      contents.forEach(item => {
        if (typeof item !== 'string') {
          childComponents.push(item)
        } else {
          hasString = true
        }
      })
      if (hasString) {
        if (i.slot.hasAttribute(attribute)) {
          return {
            state: QueryStateType.Enabled,
            value: i.slot.getAttribute(attribute)
          }
        }
        return {
          state: QueryStateType.Normal,
          value: null
        }
      }
      const states: QueryState<T>[] = []
      for (const component of childComponents) {
        const slots = component.__slots__
        if (slots.length === 0) {
          if (i.slot.hasAttribute(attribute)) {
            states.push({
              state: QueryStateType.Enabled,
              value: i.slot.getAttribute(attribute)
            })
          } else {
            return {
              state: QueryStateType.Normal,
              value: null
            }
          }
        }
        for (const slot of slots) {
          if (slot.hasAttribute(attribute)) {
            states.push({
              state: QueryStateType.Enabled,
              value: slot.getAttribute(attribute)
            })
          } else {
            return {
              state: QueryStateType.Normal,
              value: null
            }
          }
        }
      }
      return this.mergeState(states)
    })
    return this.mergeState(states)
  }

  /**
   * 查询组件在选区内的状态
   * @param component 要查询的组件
   * @param filter 查询结构过滤函数，过滤不需要的数据
   */
  queryComponent<T extends State>(
    component: ComponentConstructor<T>,
    filter?: (instance: Component<T>) => boolean): QueryState<Component<T>> {
    if (!this.selection.isSelected) {
      return {
        state: QueryStateType.Normal,
        value: null
      }
    }
    const ranges = this.selection.getRanges()
    const states = ranges.map(item => {
      let parent = Selection.getCommonAncestorComponent(item.startSlot, item.endSlot)

      while (parent) {
        if (parent.name === component.name) {
          if (!filter || filter(parent as Component<T>)) {
            return {
              state: QueryStateType.Enabled,
              value: parent as Component<T>
            }
          }
        }
        parent = parent.parent?.parent || null
      }
      return {
        state: QueryStateType.Normal,
        value: null
      }
    })
    return this.mergeState(states)
  }

  /**
   * 查询当前选区是否包含在组件内
   * @param component 要查询的组件
   */
  queryWrappedComponent<T extends State>(
    component: ComponentConstructor<T>
  ): QueryState<Component<T>> {
    const selection = this.selection
    if (!selection.isSelected || selection.isCollapsed) {
      return {
        state: QueryStateType.Normal,
        value: null
      }
    }
    const ranges = selection.getRanges()
    const instances: Component<T>[] = []
    for (const range of ranges) {
      const { startSlot, endSlot, startOffset, endOffset } = range
      if (startSlot !== endSlot ||
        endOffset! - startOffset! > 1) {
        return {
          state: QueryStateType.Normal,
          value: null
        }
      }
      const instance = startSlot.getContentAtIndex(startOffset)
      if (typeof instance !== 'string' && instance.name === component.name) {
        instances.push(instance as Component<T>)
      } else {
        return {
          state: QueryStateType.Normal,
          value: null
        }
      }
    }
    return {
      state: QueryStateType.Enabled,
      value: instances[0]
    }
  }

  private getStatesByRange<T extends FormatValue>(
    slot: Slot,
    formatter: Formatter<T>,
    startIndex: number,
    endIndex: number): QueryState<T> | null {

    if (startIndex === endIndex) {
      const format = startIndex === 0 ?
        slot.getFormatRangesByFormatter(formatter, 0, 1).shift() :
        slot.getFormatRangesByFormatter(formatter, startIndex - 1, endIndex).shift()
      if (format) {
        return {
          state: QueryStateType.Enabled,
          value: format.value
        }
      }
      return null
    }

    const childContents = slot.sliceContent(startIndex, endIndex)
    const states: Array<QueryState<T> | null> = []

    let index = startIndex

    for (const child of childContents) {
      if (typeof child === 'string' || child.__slots__.length === 0) {
        const formats = slot.getFormatRangesByFormatter(formatter, index, index + child.length)
        let s = index
        for (const f of formats) {
          if (s !== f.startIndex) {
            return {
              state: QueryStateType.Normal,
              value: null
            }
          }
          states.push({
            state: QueryStateType.Enabled,
            value: f.value
          })

          s = f.endIndex
        }

        if (s !== index + child.length) {
          return {
            state: QueryStateType.Normal,
            value: null
          }
        }
      } else {
        child.__slots__.forEach(i => {
          states.push(this.getStatesByRange(i, formatter, 0, i.length))
        })
      }
      index += child.length
    }
    return this.mergeState(states)
  }

  private mergeState<T>(states: Array<QueryState<T> | null>): QueryState<T> {
    const states1 = states.filter(i => i) as QueryState<T>[]
    const states2 = states1.filter(i => i.state !== QueryStateType.Normal)
    if (states.length !== states2.length) {
      return {
        state: QueryStateType.Normal,
        value: null
      }
    }

    if (states2.length) {
      return {
        state: QueryStateType.Enabled,
        value: states2[0].value
      }
    }
    return {
      state: QueryStateType.Normal,
      value: null
    }
  }
}
