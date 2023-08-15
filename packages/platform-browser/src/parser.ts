import { Inject, Injectable, Injector } from '@viewfly/core'
import {
  Attribute,
  ComponentInstance,
  FormatItem,
  Formatter,
  FormatValue,
  Slot
} from '@textbus/core'

import { EDITOR_OPTIONS } from './injection-tokens'
import { ViewOptions } from './browser-module'

/**
 * 插槽解析器
 */
export interface SlotParser {
  /**
   * 将指定 DOM 节点解析为插槽数据
   * @param childSlot 储存数据的插槽
   * @param slotRootElement 插槽的根节点
   * @param slotContentHostElement 插槽的内容节点
   *
   * 注意：当不传入内容节点时，Textbus 会把根节点当成内容节点
   */<T extends Slot>(childSlot: T, slotRootElement: HTMLElement, slotContentHostElement?: HTMLElement): T
}

/**
 * 组件加载器
 */
export interface ComponentLoader {
  /** 识别组件的匹配方法 */
  match(element: HTMLElement): boolean

  /** 读取组件内容的方法 */
  read(element: HTMLElement, injector: Injector, slotParser: SlotParser): ComponentInstance | Slot | void
}

export interface FormatLoaderReadResult<T extends FormatValue> {
  formatter: Formatter<T>
  value: T
}

/**
 * 格式加载器
 */
export interface FormatLoader<T extends FormatValue> {
  /**
   * 匹配一个 DOM 节点是否是某个格式节点
   * @param element
   */
  match(element: HTMLElement): boolean

  /**
   * 读取匹配到的节点，并返回读取后的信息
   * @param element
   */
  read(element: HTMLElement): FormatLoaderReadResult<T>
}

export interface AttributeLoaderReadResult<T extends FormatValue> {
  attribute: Attribute<T>
  value: T
}

/**
 * 属性加载器
 */
export interface AttributeLoader<T extends FormatValue> {
  /**
   * 匹配一个 DOM 节点是否是某个属性节点
   * @param element
   */
  match(element: HTMLElement): boolean

  /**
   * 读取匹配到的节点，并返回读取后的信息
   * @param element
   */
  read(element: HTMLElement): AttributeLoaderReadResult<T>
}

/**
 * 用于解析 HTML，并把 HTML 内容转换为 Textbus 可以支持的组件或插槽数据
 */
@Injectable()
export class Parser {
  static parseHTML(html: string) {
    return new DOMParser().parseFromString(html, 'text/html').body
  }

  componentLoaders: ComponentLoader[]
  formatLoaders: FormatLoader<any>[]
  attributeLoaders: AttributeLoader<any>[]

  constructor(@Inject(EDITOR_OPTIONS) private options: ViewOptions,
              private injector: Injector) {
    const componentLoaders = [
      ...(options.componentLoaders || [])
    ]
    const formatLoaders = [
      ...(options.formatLoaders || [])
    ]
    const attributeLoaders = [
      ...(options.attributeLoaders || [])
    ]
    // options.imports?.forEach(i => {
    //   componentLoaders.push(...(i.componentLoaders || []))
    //   formatLoaders.push(...(i.formatLoaders || []))
    // })
    this.componentLoaders = componentLoaders
    this.formatLoaders = formatLoaders
    this.attributeLoaders = attributeLoaders
  }

  /**
   * 使用指定的组件加载器解析一段 HTML 字符串
   * @param html
   * @param rootComponentLoader
   */
  parseDoc(html: string, rootComponentLoader: ComponentLoader) {
    const element = Parser.parseHTML(html)
    return rootComponentLoader.read(
      element,
      this.injector,
      (childSlot, slotRootElement, slotContentHostElement = slotRootElement) => {
        return this.readSlot(childSlot, slotRootElement, slotContentHostElement)
      }
    )
  }

  /**
   * 将一段 HTML 解析到指定插槽
   * @param html
   * @param rootSlot
   */
  parse(html: string, rootSlot: Slot) {
    const element = Parser.parseHTML(html)
    return this.readFormats(element, rootSlot)
  }

  private readComponent(el: Node, slot: Slot) {
    if (el.nodeType === Node.ELEMENT_NODE) {
      if ((el as HTMLElement).tagName === 'BR') {
        slot.insert('\n')
        return
      }
      for (const t of this.componentLoaders) {
        if (t.match(el as HTMLElement)) {
          const result = t.read(
            el as HTMLElement,
            this.injector,
            (childSlot, slotRootElement, slotContentHostElement = slotRootElement) => {
              return this.readSlot(childSlot, slotRootElement, slotContentHostElement)
            }
          )
          if (!result) {
            return
          }
          if (result instanceof Slot) {
            result.toDelta().forEach(i => slot.insert(i.insert, i.formats))
            return
          }
          slot.insert(result)
          return
        }
      }
      this.readFormats(el as HTMLElement, slot)
    } else if (el.nodeType === Node.TEXT_NODE) {
      this.readText(slot, el)
    }
  }

  private readText(slot: Slot, el: Node) {
    const textContent = el.textContent
    if (/^\s*[\r\n\u200b]+\s*$/.test(textContent as string)) {
      return
    }
    slot.insert(textContent as string)
  }

  private readFormats(el: HTMLElement, slot: Slot) {
    const formats = this.formatLoaders.filter(f => {
      return f.match(el)
    }).map(f => {
      return f.read(el)
    })
    const startIndex = slot.index
    let startNode = el.firstChild
    while (startNode) {
      this.readComponent(startNode, slot)
      startNode = startNode.nextSibling
    }
    const endIndex = slot.index
    this.applyFormats(slot, formats.map<FormatItem<any>>(i => {
      return {
        formatter: i.formatter,
        value: i.value,
        startIndex,
        endIndex
      }
    }))
    slot.retain(endIndex)
    return slot
  }

  private readSlot<T extends Slot>(childSlot: T, slotRootElement: HTMLElement, slotContentElement: HTMLElement): T {
    if (slotRootElement.nodeType === Node.ELEMENT_NODE) {
      this.attributeLoaders.filter(a => {
        return a.match(slotRootElement)
      }).forEach(a => {
        const r = a.read(slotRootElement)
        childSlot.setAttribute(r.attribute, r.value)
      })
    }
    if (slotContentElement.nodeType === Node.ELEMENT_NODE) {
      this.readFormats(slotContentElement, childSlot)
    } else {
      this.readText(childSlot, slotContentElement)
    }
    return childSlot
  }

  private applyFormats(slot: Slot, formatItems: FormatItem<any>[]) {
    slot.background(() => {
      formatItems.forEach(i => {
        slot.retain(i.startIndex)
        slot.retain(i.endIndex - i.startIndex, i.formatter, i.value)
      })
    })
  }
}
