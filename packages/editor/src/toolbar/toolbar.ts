import { auditTime, fromEvent, merge, Subscription } from '@tanbo/stream'
import { Injector } from '@tanbo/di'
import { createElement, EDITOR_OPTIONS } from '@textbus/browser'
import {
  Keymap,
  makeError,
  Renderer,
  Selection,
  Plugin
} from '@textbus/core'

import { Tool } from './types'
import { Layout } from '../layout'
import { createKeymap } from './toolkit/_utils/_create-keymap'
import { EditorOptions } from '../types'

const toolbarErrorFn = makeError('Toolbar')

export interface ToolFactory {
  (): Tool
}

/**
 * 编辑器工具条
 */
export class Toolbar implements Plugin {
  private elementRef!: HTMLElement
  private toolWrapper!: HTMLElement
  private keymapPrompt!: HTMLElement

  private subs: Subscription[] = []

  public tools: Array<Tool | Tool[]>

  constructor(private toolFactories: Array<ToolFactory | ToolFactory[]> = [], private host?: HTMLElement | string) {
    this.tools = toolFactories.map(i => {
      return Array.isArray(i) ? i.map(j => j()) : i()
    })
  }

  setup(injector: Injector) {
    const layout = injector.get(Layout)
    const selection = injector.get(Selection)
    const renderer = injector.get(Renderer)
    const options = injector.get(EDITOR_OPTIONS) as EditorOptions
    this.elementRef = createElement('div', {
      classes: ['textbus-toolbar'],
      children: [
        this.toolWrapper = createElement('div', {
          classes: ['textbus-toolbar-wrapper']
        }),
        this.keymapPrompt = createElement('div', {
          classes: ['textbus-toolbar-keymap-prompt']
        })
      ]
    })
    if (options.theme) {
      this.elementRef.classList.add('textbus-toolbar-' + options.theme)
    }
    const selector = this.host
    if (selector) {
      let host: HTMLElement
      if (typeof selector === 'string') {
        host = document.querySelector(selector)!
      } else {
        host = selector
      }
      if (!host || !(host instanceof HTMLElement)) {
        throw toolbarErrorFn('selector is not an HTMLElement, or the CSS selector cannot find a DOM element in the document.')
      }
      host.append(this.elementRef)
    } else {
      layout.top.append(this.elementRef)
    }
    this.tools.forEach(tool => {
      const group = document.createElement('div')
      group.classList.add('textbus-toolbar-group')
      this.toolWrapper.appendChild(group)
      if (Array.isArray(tool)) {
        tool.forEach(t => {
          group.appendChild(t.setup(injector, this.toolWrapper))
        })
        return
      }
      group.appendChild(tool.setup(injector, this.toolWrapper))
    })
    const tools = this.tools.flat()
    this.subs.push(
      merge(
        selection.onChange,
        renderer.onViewUpdated,
      ).pipe(auditTime(100)).subscribe(() => {
        tools.forEach(tool => {
          tool.refreshState()
        })
      }),
      fromEvent(this.elementRef, 'mouseover').subscribe(ev => {
        const keymap = this.findNeedShowKeymapHandler(ev.target as HTMLElement)
        if (keymap) {
          try {
            const config: Keymap = JSON.parse(keymap)
            this.keymapPrompt.innerHTML = ''
            this.keymapPrompt.append(...createKeymap(config))
            this.keymapPrompt.classList.add('textbus-toolbar-keymap-prompt-show')
            return
          } catch (e) {
            //
          }
        }
        this.keymapPrompt.classList.remove('textbus-toolbar-keymap-prompt-show')
      })
    )
  }

  onDestroy() {
    this.subs.forEach(i => i.unsubscribe())
  }

  private findNeedShowKeymapHandler(el: HTMLElement): string {
    if (el === this.elementRef) {
      return ''
    }
    if (el.dataset.keymap) {
      return el.dataset.keymap
    }
    return this.findNeedShowKeymapHandler(el.parentNode as HTMLElement)
  }
}
