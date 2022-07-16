import { distinctUntilChanged, map, Observable, Subject, Subscription } from '@tanbo/stream'
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
  Plugin, Controller
} from '@textbus/core'

import { Parser, OutputTranslator, ComponentResources, ComponentLoader } from './dom-support/_api'
import { createElement } from './_utils/uikit'
import {
  ViewOptions,
  Input,
  VIEW_CONTAINER,
  EDITOR_OPTIONS,
  DomRenderer,
  SelectionBridge, VIEW_MASK, VIEW_DOCUMENT, Caret
} from './core/_api'
import { DefaultShortcut } from './preset/_api'

export interface Resources {
  componentName: string
  resources: ComponentResources
}

export interface OutputContents<T = any> {
  content: T
  resourcesList: Resources[]
  styleSheets: string[]
  styleSheet: string
  links: Record<string, string>[]
  scripts: string[]
}

const editorError = makeError('CoreEditor')

/**
 * Textbus PC 端编辑器
 */
export class Viewer {
  /** 当视图获得焦点时触发 */
  onFocus: Observable<void>
  /** 当视图失去焦点时触发 */
  onBlur: Observable<void>
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

  get readonly() {
    return this.controller.readonly
  }

  set readonly(b: boolean) {
    this.controller.readonly = b
  }

  protected changeEvent = new Subject<void>()

  protected subs: Subscription[] = []

  private controller: Controller

  private workbench!: HTMLElement

  private resourceNodes: HTMLElement[] = []
  private focusEvent = new Subject<void>()
  private blurEvent = new Subject<void>()
  private resourcesList: Resources[] = []
  private styleSheet = ''
  private scripts: string[] = []
  private links: Record<string, string>[] = []

  constructor(public rootComponentLoader: ComponentLoader,
              public options: ViewOptions = {}) {
    this.onChange = this.changeEvent.asObservable()
    this.onFocus = this.focusEvent.asObservable()
    this.onBlur = this.blurEvent.asObservable()
    const { doc, mask, wrapper } = Viewer.createLayout(options.minHeight)
    this.workbench = wrapper
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
      useClass: DomRenderer
    }, {
      provide: NativeSelectionBridge,
      useClass: SelectionBridge
    }, {
      provide: Viewer,
      useValue: this
    }]
    this.injector = new Starter({
      ...options,
      components: (options.componentLoaders || []).map(i => i.component),
      formatters: (options.formatLoaders || []).map(i => i.formatter),
      providers: [
        ...(options.providers || []),
        ...staticProviders,
        ...this.defaultPlugins,
        DomRenderer,
        Parser,
        Input,
        Caret,
        SelectionBridge,
        OutputTranslator,
      ],
      setup: options.setup
    })
    this.controller = this.injector.get(Controller)
  }

  /**
   * 初始化编辑器
   * @param host 编辑器容器
   */
  async mount(host: HTMLElement): Promise<Starter> {
    if (this.destroyed) {
      throw editorError('the editor instance is destroyed!')
    }
    const starter = this.injector
    if (this.destroyed) {
      return starter
    }
    const parser = starter.get(Parser)
    const translator = starter.get(Translator)
    const doc = starter.get(VIEW_DOCUMENT)

    let component: ComponentInstance
    const content = this.options.content
    if (content) {
      if (typeof content === 'string') {
        component = parser.parseDoc(content, this.rootComponentLoader) as ComponentInstance
      } else {
        component = translator.createComponentByFactory(content, this.rootComponentLoader.component)
      }
    } else {
      component = this.rootComponentLoader.component.createInstance(starter)
    }

    this.initDocStyleSheetsAndScripts(this.options)
    host.appendChild(this.workbench)
    await starter.mount(component, doc)
    this.defaultPlugins.forEach(i => starter.get(i).setup(starter))
    const renderer = starter.get(Renderer)
    const caret = starter.get(Caret)
    this.subs.push(
      renderer.onViewChecked.subscribe(() => {
        this.changeEvent.next()
      }),
      caret.onPositionChange.pipe(
        map(p => !!p),
        distinctUntilChanged()
      ).subscribe(b => {
        if (b) {
          this.focusEvent.next()
        } else {
          this.blurEvent.next()
        }
      })
    )
    starter.get(Input)
    this.isReady = true
    this.injector = starter

    if (this.options.autoFocus) {
      starter.get(Input).onReady.then(() => {
        this.focus()
      })
    }
    return starter
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
      resourcesList: this.resourcesList,
      styleSheets: this.options?.styleSheets || [],
      styleSheet: this.styleSheet,
      links: this.links,
      scripts: this.scripts
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
      resourcesList: this.resourcesList,
      styleSheets: this.options?.styleSheets || [],
      styleSheet: this.styleSheet,
      links: this.links,
      scripts: this.scripts
    }
  }

  /**
   * 销毁编辑器
   */
  destroy() {
    if (this.destroyed) {
      return
    }
    this.destroyed = true
    this.subs.forEach(i => i.unsubscribe())
    if (this.injector) {
      this.defaultPlugins.forEach(i => {
        this.injector.get(i).onDestroy?.()
      })
      const types = [
        Input,
      ]
      types.forEach(i => {
        this.injector.get(i as Type<{ destroy(): void }>).destroy()
      })
      this.injector.destroy()
    }
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
    const parser = this.injector!.get(Parser)
    const translator = this.injector!.get(Translator)
    const rootComponentRef = this.injector!.get(RootComponentRef)
    const selection = this.injector!.get(Selection)
    const rootComponentLoader = this.rootComponentLoader!
    let component: ComponentInstance
    if (typeof content === 'string') {
      component = parser.parseDoc(content, rootComponentLoader) as ComponentInstance
    } else {
      component = translator.createComponentByFactory(content, rootComponentLoader.component)
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

  private initDocStyleSheetsAndScripts(options: ViewOptions) {
    this.resourcesList = this.getAllComponentResources()

    const resources = (options.componentLoaders || []).filter(i => i.resources).map(i => i.resources!)
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
    editModeStyles.push(...(options.editingStyleSheets || []))

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
        wordBreak: 'break-all',
        boxSizing: 'border-box',
        minHeight,
        flex: 1
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
