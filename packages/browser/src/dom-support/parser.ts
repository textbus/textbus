import { Inject, Injectable, Injector } from '@tanbo/di'
import {
  ComponentInstance,
  FormatItem, Formatter,
  FormatValue,
  Slot
} from '@textbus/core'

import { ViewOptions } from '../core/types'
import { EDITOR_OPTIONS } from '../core/injection-tokens'

export interface ComponentResources {
  links?: Array<{ [key: string]: string }>
  styles?: string[]
  scripts?: string[]
  editModeStyles?: string[]
}

export interface SlotParser {
  <T extends Slot>(childSlot: T, childElement: HTMLElement): T
}

/**
 * 组件加载器
 */
export interface ComponentLoader {
  /** 组件所需要的外部资源 */
  resources?: ComponentResources

  /** 识别组件的匹配方法 */
  match(element: HTMLElement): boolean

  /** 读取组件内容的方法 */
  read(element: HTMLElement, context: Injector, slotParser: SlotParser): ComponentInstance | Slot
}

export interface FormatLoaderReadResult {
  formatter: Formatter
  value: FormatValue
}

export interface FormatLoader {
  match(element: HTMLElement): boolean

  read(element: HTMLElement): FormatLoaderReadResult
}


@Injectable()
export class Parser {
  static parseHTML(html: string) {
    return new DOMParser().parseFromString(html, 'text/html').body
  }

  componentLoaders: ComponentLoader[]
  formatLoaders: FormatLoader[]

  constructor(@Inject(EDITOR_OPTIONS) private options: ViewOptions,
              private injector: Injector) {
    const componentLoaders = [
      ...(options.componentLoaders || [])
    ]
    const formatLoaders = [
      ...(options.formatLoaders || [])
    ]
    options.imports?.forEach(i => {
      componentLoaders.push(...(i.componentLoaders || []))
      formatLoaders.push(...(i.formatLoaders || []))
    })
    this.componentLoaders = componentLoaders
    this.formatLoaders = formatLoaders
  }

  parseDoc(html: string, rootComponentLoader: ComponentLoader) {
    const element = Parser.parseHTML(html)
    return rootComponentLoader.read(element, this.injector, (childSlot, childElement) => {
      return this.readSlot(childSlot, childElement)
    })
  }

  parse(html: string, rootSlot: Slot) {
    const element = Parser.parseHTML(html)
    const formatItems: FormatItem[] = this.readFormats(element, rootSlot, [])
    this.applyFormats(rootSlot, formatItems)
    return rootSlot
  }

  private readComponent(el: Node, slot: Slot, formatItems: FormatItem[]) {
    if (el.nodeType === Node.ELEMENT_NODE) {
      if ((el as HTMLElement).tagName === 'BR') {
        slot.insert('\n')
        return
      }
      for (const t of this.componentLoaders) {
        if (t.match(el as HTMLElement)) {
          const result = t.read(el as HTMLElement, this.injector, (childSlot, childElement) => {
            return this.readSlot(childSlot, childElement)
          })
          if (result instanceof Slot) {
            result.toDelta().forEach(i => slot.insert(i.insert, i.formats))
            return
          }
          slot.insert(result)
          return
        }
      }
      this.readFormats(el as HTMLElement, slot, formatItems)
    } else if (el.nodeType === Node.TEXT_NODE) {
      const textContent = el.textContent
      if (/^\s*[\r\n]+\s*$/.test(textContent as string)) {
        return
      }
      slot.insert(textContent as string)
    }
  }

  private readFormats(el: HTMLElement, slot: Slot, formatItems: FormatItem[]) {
    const formats = this.formatLoaders.filter(f => {
      return f.match(el)
    }).map(f => {
      return f.read(el)
    })
    const startIndex = slot.index
    Array.from(el.childNodes).forEach(child => {
      this.readComponent(child, slot, formatItems)
    })
    const endIndex = slot.index
    formatItems.unshift(...formats.map<FormatItem>(i => {
      return {
        formatter: i.formatter,
        value: i.value,
        startIndex,
        endIndex
      }
    }))
    return formatItems
  }

  private readSlot<T extends Slot>(childSlot: T, childElement: HTMLElement): T {
    const childFormatItems: FormatItem[] = this.readFormats(childElement, childSlot, [])
    this.applyFormats(childSlot, childFormatItems)
    return childSlot
  }

  private applyFormats(slot: Slot, formatItems: FormatItem[]) {
    formatItems.forEach(i => {
      slot.retain(i.startIndex)
      slot.retain(i.endIndex - i.startIndex, i.formatter, i.value)
    })
  }
}
