import { Inject, Injectable, Injector } from '@tanbo/di'
import {
  ComponentInstance,
  Component,
  FormatItem,
  Formatter,
  FormatValue,
  Slot
} from '@textbus/core'

import { BaseEditorOptions } from '../core/types'
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

export interface ComponentLoader {
  resources?: ComponentResources

  match(element: HTMLElement): boolean

  read(element: HTMLElement, context: Injector, slotParser: SlotParser): ComponentInstance

  component: Component
}

export interface FormatLoader {
  formatter: Formatter

  match(element: HTMLElement): boolean

  read(element: HTMLElement): FormatValue
}


@Injectable()
export class Parser {
  static parseHTML(html: string) {
    return new DOMParser().parseFromString(html, 'text/html').body
  }

  private loaders: ComponentLoader[]
  private formatters: FormatLoader[]

  constructor(@Inject(EDITOR_OPTIONS) private options: BaseEditorOptions,
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
    this.loaders = componentLoaders
    this.formatters = formatLoaders
  }

  parseDoc(html: string, rootComponentLoader: ComponentLoader) {
    const element = Parser.parseHTML(html)
    return rootComponentLoader.read(element, this.injector, (childSlot, childElement) => {
      return this.readSlot(childSlot, childElement)
    })
  }

  parse(html: string, rootSlot: Slot) {
    const element = Parser.parseHTML(html)
    const formatItems: FormatItem[] = []
    this.readFormats(element, rootSlot, formatItems)
    this.applyFormats(rootSlot, formatItems)
    return rootSlot
  }

  private readComponent(el: Node, slot: Slot, formatItems: FormatItem[]) {
    if (el.nodeType === Node.ELEMENT_NODE) {
      if ((el as HTMLElement).tagName === 'BR') {
        slot.insert('\n')
        return
      }
      for (const t of this.loaders) {
        if (t.match(el as HTMLElement)) {
          const componentInstance = t.read(el as HTMLElement, this.injector, (childSlot, childElement) => {
            return this.readSlot(childSlot, childElement)
          })
          slot.insert(componentInstance)
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
    const formats = this.formatters.filter(f => {
      return f.match(el)
    }).map(f => {
      return {
        formatter: f.formatter,
        value: f.read(el)
      }
    })
    const startIndex = slot.index
    Array.from(el.childNodes).forEach(child => {
      this.readComponent(child, slot, formatItems)
    })
    const endIndex = slot.index
    formatItems.push(...formats.map<FormatItem>(i => {
      return {
        formatter: i.formatter,
        value: i.value,
        startIndex,
        endIndex
      }
    }))
  }

  private readSlot<T extends Slot>(childSlot: T, childElement: HTMLElement): T {
    const childFormatItems: FormatItem[] = []
    this.readFormats(childElement, childSlot, childFormatItems)
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
