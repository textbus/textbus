import { distinctUntilChanged, map, Observable, Subject, Subscription } from '@tanbo/stream'
import { Provider } from '@tanbo/di'
import {
  NativeRenderer,
  NativeSelectionBridge,
  Renderer,
  RootComponentRef,
  makeError,
  OutputRenderer,
  Starter,
  Selection,
  ComponentInstance,
  ComponentLiteral,
  invokeListener,
  Controller,
  Component,
  History,
  Commander,
  Keyboard,
  Registry
} from '@textbus/core'

import { Parser, OutputTranslator, ComponentLoader } from './dom-support/_api'
import { createElement } from './_utils/uikit'
import {
  ViewOptions,
  MagicInput,
  Input,
  VIEW_CONTAINER,
  EDITOR_OPTIONS,
  DomRenderer,
  SelectionBridge, VIEW_MASK, VIEW_DOCUMENT, NativeInput
} from './core/_api'

export interface Resources {
  styleSheets: string[]
  styleSheet: string
  links: Record<string, string>[]
  scripts: string[]
}

const editorError = makeError('CoreEditor')

/**
 * Textbus PC 端编辑器
 */
export class Viewer extends Starter {
  /** 当视图获得焦点时触发 */
  onFocus: Observable<void>
  /** 当视图失去焦点时触发 */
  onBlur: Observable<void>
  /** 当编辑器内容变化时触发 */
  onChange: Observable<void>
  /** 当用户按 Ctrl + S 时触发 */
  onSave: Observable<void>

  /** 编辑器是否已销毁 */
  destroyed = false
  /** 编辑器是否已准备好 */
  isReady = false

  get readonly() {
    return this.controller.readonly
  }

  set readonly(b: boolean) {
    this.controller.readonly = b
  }

  isFocus() {
    return this._isFocus
  }

  protected changeEvent = new Subject<void>()

  protected subs: Subscription[] = []
  protected _isFocus = false

  private controller: Controller

  private workbench!: HTMLElement

  private id: string
  private resourceNodes: HTMLElement[] = []
  private focusEvent = new Subject<void>()
  private blurEvent = new Subject<void>()
  private saveEvent = new Subject<void>()
  private styleSheet = ''
  private scripts: string[] = []
  private links: Record<string, string>[] = []

  constructor(public rootComponent: Component,
              public rootComponentLoader: ComponentLoader,
              public options: ViewOptions = {}) {
    const id = 'textbus-' + Number((Math.random() + '').substring(2)).toString(16)
    const { doc, mask, wrapper } = Viewer.createLayout(id, options.minHeight)
    const staticProviders: Provider[] = [{
      provide: EDITOR_OPTIONS,
      useValue: options
    }, {
      provide: VIEW_CONTAINER,
      useValue: wrapper
    }, {
      provide: VIEW_DOCUMENT,
      useValue: doc
    }, {
      provide: VIEW_MASK,
      useValue: mask
    }, {
      provide: NativeRenderer,
      useExisting: DomRenderer
    }, {
      provide: NativeSelectionBridge,
      useExisting: SelectionBridge
    }, {
      provide: Input,
      useClass: options.useContentEditable ? NativeInput : MagicInput
    }, {
      provide: Viewer,
      useFactory: () => this
    }]
    super({
      ...options,
      plugins: options.plugins || [],
      providers: [
        ...(options.providers || []),
        ...staticProviders,
        DomRenderer,
        Parser,
        SelectionBridge,
        OutputTranslator,
      ],
      setup: options.setup
    })
    this.id = id
    this.workbench = wrapper
    this.onChange = this.changeEvent.asObservable()
    this.onFocus = this.focusEvent.asObservable()
    this.onBlur = this.blurEvent.asObservable()
    this.onSave = this.saveEvent.asObservable()
    this.controller = this.get(Controller)
  }

  /**
   * 初始化编辑器
   * @param host 编辑器容器
   */
  override async mount(host: HTMLElement): Promise<this> {
    if (this.destroyed) {
      throw editorError('the editor instance is destroyed!')
    }
    if (this.destroyed) {
      return this
    }
    const parser = this.get(Parser)
    const registry = this.get(Registry)
    const doc = this.get(VIEW_DOCUMENT)

    this.initDefaultShortcut()
    let component: ComponentInstance
    const content = this.options.content
    if (content) {
      if (typeof content === 'string') {
        component = parser.parseDoc(content, this.rootComponentLoader) as ComponentInstance
      } else {
        component = registry.createComponentByFactory(content, this.rootComponent)
      }
    } else {
      component = this.rootComponent.createInstance(this)
    }

    this.initDocStyleSheetsAndScripts(this.options)
    host.appendChild(this.workbench)
    await super.mount(doc, component)
    const renderer = this.get(Renderer)
    const input = this.get(Input)
    this.subs.push(
      renderer.onViewUpdated.subscribe(() => {
        this.changeEvent.next()
      }),
      input.caret.onPositionChange.pipe(
        map(p => !!p),
        distinctUntilChanged()
      ).subscribe(b => {
        if (b) {
          this._isFocus = true
          this.focusEvent.next()
        } else {
          this._isFocus = false
          this.blurEvent.next()
        }
      })
    )
    this.isReady = true

    if (this.options.autoFocus) {
      input.onReady.then(() => {
        this.focus()
      })
    }
    return this
  }

  /**
   * 获取焦点
   */
  focus() {
    this.guardReady()
    const selection = this.get(Selection)
    const rootComponentRef = this.get(RootComponentRef)
    if (selection.commonAncestorSlot) {
      selection.restore()
      return
    }
    const location = selection.findFirstPosition(rootComponentRef.component.slots.get(0)!)
    selection.setPosition(location.slot, location.offset)
    selection.restore()
  }

  /**
   * 取消编辑器焦点
   */
  blur() {
    if (this.isReady) {
      const selection = this.get(Selection)
      selection.unSelect()
      selection.restore()
    }
  }

  /**
   * 获取编辑器所有资源
   */
  getResources() {
    return {
      styleSheets: this.options?.styleSheets || [],
      styleSheet: this.styleSheet,
      links: this.links,
      scripts: this.scripts
    }
  }

  /**
   * 获取 HTML 格式的内容
   */
  getContent(): string {
    this.guardReady()

    const outputRenderer = this.get(OutputRenderer)
    const outputTranslator = this.get(OutputTranslator)

    const vDom = outputRenderer.render()
    return outputTranslator.transform(vDom)
  }

  /**
   * 获取 JSON 格式的内容
   */
  getJSON(): ComponentLiteral {
    this.guardReady()

    const rootComponentRef = this.get(RootComponentRef)
    return rootComponentRef.component.toJSON()
  }

  /**
   * 销毁编辑器
   */
  override destroy() {
    if (this.destroyed) {
      return
    }
    this.destroyed = true
    this.subs.forEach(i => i.unsubscribe())
    const types = [
      Input,
    ]
    types.forEach(i => {
      this.get(i).destroy()
    })
    super.destroy()
    this.workbench.parentNode?.removeChild(this.workbench)
    this.resourceNodes.forEach(node => {
      node.parentNode?.removeChild(node)
    })
  }

  /**
   * 替换编辑的内容
   * @param content
   */
  replaceContent(content: string | ComponentLiteral) {
    this.guardReady()
    const parser = this.get(Parser)
    const registry = this.get(Registry)
    const rootComponentRef = this.get(RootComponentRef)
    const selection = this.get(Selection)
    const rootComponentLoader = this.rootComponentLoader!
    let component: ComponentInstance
    if (typeof content === 'string') {
      component = parser.parseDoc(content, rootComponentLoader) as ComponentInstance
    } else {
      component = registry.createComponentByFactory(content, this.rootComponent)
    }
    selection.unSelect()
    rootComponentRef.component.slots.clean()
    rootComponentRef.component.slots.push(...component.slots.toArray())
    invokeListener(component, 'onDestroy')
  }

  protected guardReady() {
    if (this.destroyed) {
      throw editorError('the editor instance is destroyed!')
    }
    if (!this.isReady) {
      throw editorError('please wait for the editor to initialize before getting the content!')
    }
  }

  private initDefaultShortcut() {
    const selection = this.get(Selection)
    const keyboard = this.get(Keyboard)
    const history = this.get(History)
    const commander = this.get(Commander)
    keyboard.addShortcut({
      keymap: {
        key: 's',
        ctrlKey: true
      },
      action: () => {
        this.saveEvent.next()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 'Enter'
      },
      action: () => {
        commander.break()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 'Enter',
        shiftKey: true
      },
      action: () => {
        const startOffset = selection.startOffset!
        const startSlot = selection.startSlot!
        const isToEnd = startOffset === startSlot.length || startSlot.isEmpty
        const content = isToEnd ? '\n\n' : '\n'
        const isInserted = commander.insert(content)
        if (isInserted && isToEnd) {
          selection.setPosition(startSlot, startOffset + 1)
        }
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: ['Delete', 'Backspace']
      },
      action: (key) => {
        commander.delete(key === 'Backspace')
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
      },
      action: (key) => {
        switch (key) {
          case 'ArrowLeft':
            selection.toPrevious()
            break
          case 'ArrowRight':
            selection.toNext()
            break
          case 'ArrowUp':
            selection.toPreviousLine()
            break
          case 'ArrowDown':
            selection.toNextLine()
            break
        }
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'],
        shiftKey: true
      },
      action: (key) => {
        switch (key) {
          case 'ArrowLeft':
            selection.wrapToBefore()
            break
          case 'ArrowRight':
            selection.wrapToAfter()
            break
          case 'ArrowUp':
            selection.wrapToTop()
            break
          case 'ArrowDown':
            selection.wrapToBottom()
            break
        }
      }
    })

    keyboard.addShortcut({
      keymap: {
        key: 'Tab'
      },
      action: () => {
        commander.insert('    ')
      }
    })

    keyboard.addShortcut({
      keymap: {
        key: 'a',
        ctrlKey: true
      },
      action: () => {
        selection.selectAll()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 'c',
        ctrlKey: true
      },
      action: () => {
        commander.copy()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 'x',
        ctrlKey: true
      },
      action: () => {
        commander.cut()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 'z',
        ctrlKey: true
      },
      action: () => {
        history.back()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 'z',
        ctrlKey: true,
        shiftKey: true
      },
      action: () => {
        history.forward()
      }
    })
  }

  private initDocStyleSheetsAndScripts(options: ViewOptions) {
    const loaders: ComponentLoader[] = []
    options.imports?.forEach(module => {
      loaders.push(...(module.componentLoaders || []))
    })
    loaders.push(...(options.componentLoaders || []))
    const resources = loaders.filter(i => i.resources).map(i => i.resources!)
    const docStyles: string[] = []
    const editModeStyles: string[] = []
    resources.forEach(metadata => {
      if (Array.isArray(metadata.links)) {
        this.links.push(...metadata.links)
      }
      docStyles.push(metadata.styles?.join('') || '')
      editModeStyles.push(metadata.editModeStyles?.join('') || '')
    })

    this.links.forEach(link => {
      const linkEle = document.createElement('link')
      Object.assign(linkEle, link)
      this.resourceNodes.push(linkEle)
      document.head.appendChild(linkEle)
    })
    const styleEl = document.createElement('style')
    docStyles.push(...(options.styleSheets || []))
    editModeStyles.push(`#${this.id} *::selection{background-color: rgba(18, 150, 219, .2); color:inherit}`,
      ...(options.editingStyleSheets || []))

    this.styleSheet = Viewer.cssMin(docStyles.join(''))

    styleEl.innerHTML = this.styleSheet + Viewer.cssMin(editModeStyles.join(''))

    this.resourceNodes.push(styleEl)
    document.head.append(styleEl)

    resources.filter(i => i.scripts?.length).map(i => i.scripts).flat().forEach(src => {
      if (src) {
        const script = document.createElement('script')
        script.src = src
        this.scripts.push(src)
        document.head.appendChild(script)
        this.resourceNodes.push(script)
      }
    })
  }

  private static createLayout(id: string, minHeight = '100%') {
    const doc = createElement('div', {
      styles: {
        cursor: 'text',
        wordBreak: 'break-all',
        boxSizing: 'border-box',
        minHeight,
        flex: 1,
        outline: 'none'
      },
      attrs: {
        'data-textbus-view': VIEW_DOCUMENT,
      },
      props: {
        id
      }
    })
    const mask = createElement('div', {
      attrs: {
        'data-textbus-view': VIEW_MASK,
      },
      styles: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 1,
        pointerEvents: 'none',
        overflow: 'hidden'
      }
    })
    const wrapper = createElement('div', {
      attrs: {
        'data-textbus-view': VIEW_CONTAINER,
      },
      styles: {
        display: 'flex',
        minHeight: '100%',
        position: 'relative',
        flexDirection: 'column'
      },
      children: [doc, mask]
    })
    return {
      wrapper,
      doc,
      mask
    }
  }

  private static cssMin(str: string) {
    return str
      .replace(/\s*(?=[>{}:;,[])/g, '')
      .replace(/([>{}:;,])\s*/g, '$1')
      .replace(/;}/g, '}').replace(/\s+/, ' ').trim()
  }
}
