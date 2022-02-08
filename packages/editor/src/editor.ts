import { Injector, Provider, Type } from '@tanbo/di'
import { fromPromise, Observable, of, Subject } from '@tanbo/stream'
import { makeError, Selection } from '@textbus/core'
import { CoreEditor } from '@textbus/browser'

import { EditorOptions } from './types'
import { rootComponent } from './root.component'
import { Layout } from './layout'
import { I18n } from './i18n'
import { i18n_zh_CN } from './i18n/zh_CN'
import { ContextMenu } from './context-menu'
import { Dialog } from './dialog'
import { EditorController } from './editor-controller'
import { Message } from './message'
import { FileUploader, UploadConfig } from './file-uploader'

const editorErrorFn = makeError('Editor')

export class Editor extends CoreEditor {
  onReady: Observable<Injector>
  layout = new Layout()

  private host: HTMLElement

  private readyEvent = new Subject<Injector>()

  constructor(public selector: string | HTMLElement,
              options: EditorOptions = {}) {
    super(options.rootComponent || rootComponent)
    if (typeof selector === 'string') {
      this.host = document.querySelector(selector)!
    } else {
      this.host = selector
    }
    if (!this.host || !(this.host instanceof HTMLElement)) {
      throw editorErrorFn('selector is not an HTMLElement, or the CSS selector cannot find a DOM element in the document.')
    }
    this.onReady = this.readyEvent.asObservable()
    this.layout.workbench.append(this.scroller)
    if (options.theme) {
      this.layout.setTheme(options.theme)
    }
    this.host.append(this.layout.container)

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
                end: [0, 0]
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
            return of('')
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
    options.editingStyleSheets.push(`body{padding-bottom:50px}[textbus-document=true]{overflow:hidden}[textbus-document=true]::before {content: attr(data-placeholder); position: absolute; opacity: 0.6; z-index: -1;}`)
    this.init(options).then(rootInjector => {
      rootInjector.get(ContextMenu)
      setTimeout(() => {
        if (this.destroyed) {
          return
        }
        options.plugins?.forEach(plugin => {
          plugin.setup(rootInjector)
        })
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
    this.layout.container.parentNode?.removeChild(this.layout.container)
    super.destroy()
  }
}
