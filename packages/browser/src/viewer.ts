import { BehaviorSubject, Observable, Subject, Subscription } from '@tanbo/stream'
import { Provider, Type } from '@tanbo/di'
import {
  NativeRenderer,
  NativeSelectionBridge,
  Renderer,
  RootComponentRef,
  Translator,
  makeError,
  OutputRenderer,
  Starter,
  Selection,
  ComponentInstance,
  ComponentLiteral,
  invokeListener,
} from '@textbus/core'

import { Parser, OutputTranslator, ComponentResources, ComponentLoader } from './dom-support/_api'
import { createElement } from './_utils/uikit'
import {
  BaseEditorOptions,
  Input,
  EDITABLE_DOCUMENT,
  EDITOR_CONTAINER,
  EDITOR_OPTIONS,
  DomRenderer,
  SelectionBridge, Plugin, EDITOR_MASK, RESIZE_OBSERVER, DOC_CONTAINER, Caret
} from './core/_api'
import { DefaultShortcut } from './preset/_api'

export interface OutputContents<T = any> {
  content: T
  resourcesList: Array<{ componentName: string, resources: ComponentResources }>
  styleSheets: string[]
}

const editorError = makeError('CoreEditor')

/**
 * Textbus PC 端编辑器
 */
export class Viewer {
  /** 当编辑器内容变化时触发 */
  onChange: Observable<void>

  /** 访问编辑器内部实例的 IoC 容器 */
  injector: Starter

  /** 编辑器是否已销毁 */
  destroyed = false
  /** 编辑器是否已准备好 */
  isReady = false

  protected defaultPlugins: Type<Plugin>[] = [
    DefaultShortcut,
  ]

  protected changeEvent = new Subject<void>()

  protected subs: Subscription[] = []

  private workbench!: HTMLElement

  private initBeforeListener: Promise<unknown>[] = []

  private resourceNodes: HTMLElement[] = []

  private setupCallback: (() => void) | null = null

  constructor(private rootComponentLoader: ComponentLoader,
              private options: BaseEditorOptions = {}) {
    this.onChange = this.changeEvent.asObservable()
    const {doc, mask, wrapper} = Viewer.createLayout(options.minHeight)
    this.workbench = wrapper
    const staticProviders: Provider[] = [{
      provide: EDITABLE_DOCUMENT,
      useValue: document
    }, {
      provide: EDITOR_OPTIONS,
      useValue: options
    }, {
      provide: EDITOR_CONTAINER,
      useValue: wrapper
    }, {
      provide: DOC_CONTAINER,
      useValue: doc
    }, {
      provide: RESIZE_OBSERVER,
      useFactory: () => {
        const subject = new BehaviorSubject<DOMRect>(wrapper.getBoundingClientRect())
        const resizeObserver = new ResizeObserver(() => {
          subject.next(wrapper.getBoundingClientRect())
        })
        resizeObserver.observe(wrapper)
        this.subs.push(new Subscription(() => {
          resizeObserver.disconnect()
        }))
        return subject
      }
    }, {
      provide: EDITOR_MASK,
      useValue: mask
    }, {
      provide: NativeRenderer,
      useClass: DomRenderer
    }, {
      provide: NativeSelectionBridge,
      useClass: SelectionBridge
    }, {
      provide: Viewer,
      useValue: this
    }]
    this.injector = new Starter({
      markdownDetect: options.markdownDetect,
      components: (options.componentLoaders || []).map(i => i.component),
      formatters: (options.formatLoaders || []).map(i => i.formatter),
      providers: [
        ...staticProviders,
        ...this.defaultPlugins,
        ...(options.providers || []),
        DomRenderer,
        Parser,
        Input,
        Caret,
        SelectionBridge,
        OutputTranslator,
      ],
      setup: stater => {
        this.setupCallback = options.setup?.(stater) || null
      }
    })
  }

  /**
   * 初始化编辑器
   * @param host 编辑器容器
   */
  mount(host: HTMLElement,): Promise<Starter> {
    if (this.destroyed) {
      return Promise.reject(editorError('the editor instance is destroyed!'))
    }
    return Promise.resolve().then(() => {
      const starter = this.injector
      if (this.destroyed) {
        return starter
      }
      const parser = starter.get(Parser)
      const translator = starter.get(Translator)
      const doc = starter.get(DOC_CONTAINER)

      let component: ComponentInstance
      const content = this.options.content
      if (content) {
        if (typeof content === 'string') {
          component = parser.parseDoc(content, this.rootComponentLoader)
        } else {
          component = translator.createComponentByFactory(content, this.rootComponentLoader.component)
        }
      } else {
        component = this.rootComponentLoader.component.createInstance(starter)
      }

      host.appendChild(this.workbench)
      starter.mount(component, doc)

      this.initDocStyleSheetsAndScripts(this.options)
      this.defaultPlugins.forEach(i => starter.get(i).setup(starter))
      this.options.plugins?.forEach(p => p.setup(starter))

      return this.initBeforeListener.reduce((p1, p2) => {
        return p1.then(() => p2)
      }, Promise.resolve()).then(() => {
        return starter
      })
    }).then(starter => {
      const renderer = starter.get(Renderer)
      this.subs.push(renderer.onViewChecked.subscribe(() => {
        this.changeEvent.next()
      }))
      starter.get(Input)
      this.isReady = true
      this.injector = starter

      if (this.options.autoFocus) {
        this.focus()
      }
      return starter
    })
  }

  /**
   * 获取焦点
   */
  focus() {
    this.guardReady()
    const injector = this.injector!
    const selection = injector.get(Selection)
    const rootComponentRef = injector.get(RootComponentRef)
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
      const injector = this.injector!
      const selection = injector.get(Selection)
      selection.unSelect()
      selection.restore()
    }
  }

  /**
   * 获取 content 为 HTML 格式的内容
   */
  getContents(): OutputContents<string> {
    this.guardReady()
    const injector = this.injector!

    const outputRenderer = injector.get(OutputRenderer)
    const outputTranslator = injector.get(OutputTranslator)

    const vDom = outputRenderer.render()
    const html = outputTranslator.transform(vDom)

    return {
      content: html,
      resourcesList: this.getAllComponentResources(),
      styleSheets: this.options?.styleSheets || []
    }
  }

  /**
   * 获取 content 为 JSON 格式的内容
   */
  getJSON(): OutputContents<ComponentLiteral> {
    this.guardReady()
    const injector = this.injector!

    const rootComponentRef = injector.get(RootComponentRef)

    return {
      content: rootComponentRef.component.toJSON(),
      resourcesList: this.getAllComponentResources(),
      styleSheets: this.options?.styleSheets || []
    }
  }

  /**
   * 销毁编辑器
   */
  destroy() {
    if (this.destroyed) {
      return
    } else {
      this.destroyed = true
      this.setupCallback?.()
      this.subs.forEach(i => i.unsubscribe())
      this.options.plugins?.forEach(i => {
        i.onDestroy?.()
      })
      if (this.injector) {
        const types = [
          Input,
        ]
        types.forEach(i => {
          this.injector!.get(i as Type<{ destroy(): void }>).destroy()
        })
        this.injector.destroy()
      }
      this.workbench.parentNode?.removeChild(this.workbench)
      this.resourceNodes.forEach(node => {
        node.parentNode?.removeChild(node)
      })
    }
  }

  /**
   * 替换编辑的内容
   * @param content
   */
  replaceContent(content: string | ComponentLiteral) {
    this.guardReady()
    const parser = this.injector!.get(Parser)
    const translator = this.injector!.get(Translator)
    const rootComponentRef = this.injector!.get(RootComponentRef)
    const selection = this.injector!.get(Selection)
    const rootComponentLoader = this.rootComponentLoader!
    let component: ComponentInstance
    if (typeof content === 'string') {
      component = parser.parseDoc(content, rootComponentLoader)
    } else {
      component = translator.createComponentByFactory(content, rootComponentLoader.component)
    }
    selection.unSelect()
    rootComponentRef.component.slots.clean()
    rootComponentRef.component.slots.push(...component.slots.toArray())
    invokeListener(component, 'onDestroy')
  }

  addInitBeforeListener(promise: Promise<unknown>) {
    this.initBeforeListener.push(promise)
  }

  protected guardReady() {
    if (this.destroyed) {
      throw editorError('the editor instance is destroyed!')
    }
    if (!this.isReady) {
      throw editorError('please wait for the editor to initialize before getting the content!')
    }
  }

  private initDocStyleSheetsAndScripts(options: BaseEditorOptions) {
    const links: Array<{ [key: string]: string }> = []

    const resources = (options.componentLoaders || []).filter(i => i.resources).map(i => i.resources!)
    const componentStyles = resources.map(metadata => {
      if (Array.isArray(metadata.links)) {
        links.push(...metadata.links)
      }
      return [metadata.styles?.join('') || '', metadata.editModeStyles?.join('') || ''].join('')
    }).join('')

    links.forEach(link => {
      const linkEle = document.createElement('link')
      Object.assign(linkEle, link)
      this.resourceNodes.push(linkEle)
      document.head.appendChild(linkEle)
    })
    const docStyles = Viewer.cssMin([componentStyles, ...(options.styleSheets || [])].join(''))
    const styleEl = document.createElement('style')
    styleEl.innerHTML = Viewer.cssMin([...docStyles, ...(options.editingStyleSheets || [])].join(''))
    this.resourceNodes.push(styleEl)
    document.head.append(styleEl)

    resources.filter(i => i.scripts?.length).map(i => i.scripts).flat().forEach(src => {
      if (src) {
        const script = document.createElement('script')
        script.src = src
        document.head.appendChild(script)
        this.resourceNodes.push(script)
      }
    })
  }

  private getAllComponentResources() {
    const resources: Array<{ componentName: string, resources: ComponentResources }> = []
    this.options!.componentLoaders?.forEach(i => {
      if (i.resources) {
        resources.push({
          componentName: i.component.name,
          resources: i.resources
        })
      }
    })

    return resources
  }

  private static createLayout(minHeight = '100%') {
    const id = 'textbus-' + Number((Math.random() + '').substring(2)).toString(16)
    const doc = createElement('div', {
      styles: {
        cursor: 'text',
        padding: '8px',
        wordBreak: 'break-all',
        minHeight,
      },
      props: {
        id
      }
    })
    const mask = createElement('div', {
      styles: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 1,
        pointerEvents: 'none'
      }
    })
    const wrapper = createElement('div', {
      styles: {
        width: '100%',
        height: '100%',
        position: 'relative',
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
