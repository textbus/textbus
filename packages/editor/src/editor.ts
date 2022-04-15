import { Provider, Type } from '@tanbo/di'
import { fromPromise, Observable, of, Subject } from '@tanbo/stream'
import { makeError, Selection, Starter } from '@textbus/core'
import { CoreEditor, SelectionBridge } from '@textbus/browser'

import { EditorOptions } from './types'
import { rootComponentLoader } from './root.component'
import { Layout } from './layout'
import { I18n } from './i18n'
import { i18n_zh_CN } from './i18n/zh_CN'
import { ContextMenu } from './context-menu'
import { Dialog } from './dialog'
import { EditorController } from './editor-controller'
import { Message } from './message'
import { FileUploader, UploadConfig } from './file-uploader'

const editorErrorFn = makeError('Editor')

/**
 * 基于 Textbus 内核和 PC 浏览器中间层的富文本实现
 */
export class Editor extends CoreEditor {
  /** 编辑器是否初始化完成可观察对象 */
  onReady: Observable<Starter>
  /** 编辑器 UI 布局相关的 DOM 对象管理类 */
  layout: Layout

  private host: HTMLElement

  private readyEvent = new Subject<Starter>()

  constructor(public selector: string | HTMLElement,
              options: EditorOptions = {}) {
    super()
    if (typeof selector === 'string') {
      this.host = document.querySelector(selector)!
    } else {
      this.host = selector
    }
    if (!this.host || !(this.host instanceof HTMLElement)) {
      throw editorErrorFn('selector is not an HTMLElement, or the CSS selector cannot find a DOM element in the document.')
    }
    this.onReady = this.readyEvent.asObservable()
    this.layout = new Layout(options.autoHeight)
    if (options.theme) {
      this.layout.setTheme(options.theme)
    }
    this.host.append(this.layout.container)

    if (options.autoHeight) {
      this.layout.scroller.style.overflow = 'visible'
    }

    const editorProviders: Provider[] = [{
      provide: Layout,
      useValue: this.layout
    }, {
      provide: I18n,
      useValue: new I18n(i18n_zh_CN, options.i18n as any)
    }, {
      provide: EditorController,
      useValue: new EditorController({
        readonly: false,
        supportMarkdown: false
      })
    }, {
      provide: Editor,
      useValue: this
    }, {
      provide: FileUploader,
      useFactory(selection: Selection, message: Message, i18n: I18n) {
        return {
          upload: (config: UploadConfig): Observable<string | string[]> => {
            if (!selection.isSelected) {
              selection.usePaths({
                start: [0, 0],
                end: [0, 0],
                focusEnd: true
              })
              selection.restore()
            }
            if (typeof options.uploader === 'function') {
              const result = options.uploader(config)
              if (result instanceof Observable) {
                return result
              } else if (result instanceof Promise) {
                return fromPromise(result)
              } else if (typeof result === 'string') {
                return of(result)
              } else if (Array.isArray(result)) {
                return of(result)
              }
            }
            message.message(i18n.get('editor.noUploader'))
            return config.multiple ? of([]) : of('')
          }
        }
      },
      deps: [Selection, Message, I18n]
    },
      ContextMenu,
      Dialog,
      Message
    ]
    options.providers = options.providers || []
    options.providers.push(...editorProviders)

    options.editingStyleSheets = options.editingStyleSheets || []
    options.editingStyleSheets.push(`[textbus-document=true]::before {content: attr(data-placeholder); position: absolute; opacity: 0.6;}`)
    this.init(this.layout.scroller, options.rootComponentLoader || rootComponentLoader, options).then(rootInjector => {
      rootInjector.get(ContextMenu)
      setTimeout(() => {
        if (this.destroyed) {
          return
        }
        options.plugins?.forEach(plugin => {
          plugin.setup(rootInjector)
        })
        this.layout.listenCaretChange(rootInjector.get(SelectionBridge))
        this.readyEvent.next(rootInjector)
      })
    })
  }

  override destroy() {
    if (this.destroyed) {
      return
    }
    if (this.injector) {
      const types = [
        ContextMenu,
        Dialog
      ]

      types.forEach(i => {
        this.injector!.get(i as Type<{ destroy(): void }>).destroy()
      })
    }
    this.layout.destroy()
    this.layout.container.parentNode?.removeChild(this.layout.container)
    super.destroy()
  }
}
