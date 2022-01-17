import { Injector, NullInjector, Provider, ReflectiveInjector, Type } from '@tanbo/di'
import {
  Commander, COMPONENT_LIST,
  Component, ComponentList, FORMATTER_LIST, FormatterList,
  History, HOST_NATIVE_NODE,
  NativeRenderer,
  NativeSelectionBridge,
  Query,
  Renderer, RootComponentRef,
  TBSelection,
  Translator, LifeCycle, makeError, OutputRenderer, Keyboard
} from '@textbus/core'

import { Parser, ComponentRef, OutputTranslator, ComponentResources } from './dom-support/_api'
import { createElement } from './_utils/uikit'
import {
  getIframeHTML,
  BaseEditorOptions,
  Input,
  EDITABLE_DOCUMENT,
  EDITOR_CONTAINER,
  EDITOR_OPTIONS,
  INIT_CONTENT,
  ROOT_COMPONENT_FACTORY,
  DomRenderer,
  SelectionBridge, TBPlugin, SCROLL_CONTAINER
} from './core/_api'
import { DefaultShortcut } from './preset/_api'
import { Observable, Subject, Subscription } from '@tanbo/stream'

export interface OutputContents<T = any> {
  content: T
  resourcesList: Array<{ componentName: string, resources: ComponentResources }>
  styleSheets: string[]
}

const editorError = makeError('CoreEditor')

export class CoreEditor {
  onChange: Observable<void>
  scroller = createElement('div', {
    styles: {
      overflow: 'auto',
      width: '100%',
      height: '100%',
      boxSizing: 'border-box'
    }
  })

  injector: Injector | null = null

  destroyed = false
  isReady = false
  options: BaseEditorOptions = {}

  protected plugins: TBPlugin[] = []

  protected docContainer = createElement('div', {
    styles: {
      padding: '8px 0',
      position: 'relative',
      boxShadow: '1px 2px 4px rgb(0,0,0,0.2)',
      backgroundColor: '#fff',
      minHeight: '100%',
      margin: '0 auto',
      transition: 'width 1.2s cubic-bezier(.36,.66,.04,1)',
      boxSizing: 'border-box'
    }
  })

  protected defaultPlugins: Type<TBPlugin>[] = [
    DefaultShortcut,
  ]

  protected changeEvent = new Subject<void>()

  protected subs: Subscription[] = []

  constructor(public rootComponentFactory: Component) {
    this.onChange = this.changeEvent.asObservable()
    this.scroller.appendChild(this.docContainer)
  }

  init(options: BaseEditorOptions): Promise<Injector> {
    if (this.destroyed) {
      return Promise.reject(editorError('the editor instance is destroyed!'))
    }
    this.options = options
    this.plugins = options.plugins || []
    return this.createLayout().then(layout => {
      const staticProviders: Provider[] = [{
        provide: EDITABLE_DOCUMENT,
        useValue: layout.document
      }, {
        provide: EDITOR_OPTIONS,
        useValue: options
      }, {
        provide: EDITOR_CONTAINER,
        useValue: layout.workbench
      }, {
        provide: SCROLL_CONTAINER,
        useValue: this.scroller
      }, {
        provide: INIT_CONTENT,
        useValue: options.content || ''
      }, {
        provide: ROOT_COMPONENT_FACTORY,
        useValue: this.rootComponentFactory
      }, {
        provide: NativeRenderer,
        useClass: DomRenderer
      }, {
        provide: NativeSelectionBridge,
        useClass: SelectionBridge
      }, {
        provide: HOST_NATIVE_NODE,
        useValue: layout.document.body
      }, {
        provide: RootComponentRef,
        useClass: ComponentRef
      }, {
        provide: COMPONENT_LIST,
        useValue: (options.componentLoaders || []).map(i => i.component)
      }, {
        provide: FORMATTER_LIST,
        useValue: (options.formatLoaders || []).map(i => i.formatter)
      }, {
        provide: Injector,
        useFactory() {
          return rootInjector
        }
      }]

      const rootInjector = new ReflectiveInjector(new NullInjector(), [
        ...staticProviders,
        Commander,
        ComponentList,
        FormatterList,
        Keyboard,
        History,
        Query,
        OutputRenderer,
        Renderer,
        TBSelection,
        Translator,
        LifeCycle,

        DomRenderer,
        Parser,
        Input,
        SelectionBridge,
        ComponentRef,
        OutputTranslator,
        ...this.defaultPlugins,
        ...(options.providers || [])
      ])

      return this.bootstrap(rootInjector)
    })
  }

  getContents(): OutputContents<string> {
    if (this.destroyed) {
      throw editorError('the editor instance is destroyed!')
    }
    if (!this.isReady) {
      throw editorError('please wait for the editor to initialize before getting the content!')
    }
    const injector = this.injector!

    const outputRenderer = injector.get(OutputRenderer)
    const outputTranslator = injector.get(OutputTranslator)
    const rootComponentRef = injector.get(RootComponentRef as Type<RootComponentRef>)

    const vDom = outputRenderer.render(rootComponentRef.component)
    const html = outputTranslator.transform(vDom)

    return {
      content: html,
      resourcesList: this.getAllComponentResources(),
      styleSheets: this.options?.styleSheets || []
    }
  }

  getJSON(): OutputContents {
    if (this.destroyed) {
      throw editorError('the editor instance is destroyed!')
    }
    if (!this.isReady) {
      throw editorError('please wait for the editor to initialize before getting the content!')
    }
    const injector = this.injector!

    const rootComponentRef = injector.get(RootComponentRef as Type<RootComponentRef>)

    return {
      content: rootComponentRef.component.toJSON(),
      resourcesList: this.getAllComponentResources(),
      styleSheets: this.options?.styleSheets || []
    }
  }

  destroy() {
    if (this.destroyed) {
      return
    } else {
      this.destroyed = true
      this.subs.forEach(i => i.unsubscribe())
      if (this.injector) {
        const types = [
          Input,
          History,
          LifeCycle
        ]
        types.forEach(i => {
          this.injector!.get(i as Type<{ destroy(): void }>).destroy()
        })
      }
      this.plugins.forEach(i => {
        i.onDestroy?.()
      })
      this.scroller.parentNode?.removeChild(this.scroller)
    }
  }

  private bootstrap(rootInjector: ReflectiveInjector) {
    const doc = rootInjector.get(EDITABLE_DOCUMENT)
    const options = rootInjector.get(EDITOR_OPTIONS)
    const rootComponentRef = rootInjector.get(ComponentRef)
    const renderer = rootInjector.get(Renderer)

    this.initDocStyleSheets(doc, options)
    this.defaultPlugins.forEach(i => rootInjector.get(i).setup(rootInjector))

    const resizeObserver = new ResizeObserver((e) => {
      this.docContainer.style.height = e[0].borderBoxSize[0].blockSize + 'px'
    })
    resizeObserver.observe(doc.body as any)
    return rootComponentRef.init().then(() => {
      if (this.destroyed) {
        return rootInjector
      }
      rootInjector.get(Input)
      rootInjector.get(History).listen()
      rootInjector.get(LifeCycle).init()
      this.subs.push(renderer.onViewChecked.subscribe(() => {
        this.changeEvent.next()
      }))
      this.isReady = true
      this.injector = rootInjector
      return rootInjector
    })
  }

  private initDocStyleSheets(doc: Document, options: BaseEditorOptions) {
    const links: Array<{ [key: string]: string }> = []

    const componentStyles = (options.componentLoaders || []).filter(i => i.resources).map(i => i.resources!).map(metadata => {
      if (Array.isArray(metadata.links)) {
        links.push(...metadata.links)
      }
      return [metadata.styles?.join('') || '', metadata.editModeStyles?.join('') || ''].join('')
    }).join('')

    links.forEach(link => {
      const linkEle = doc.createElement('link')
      Object.assign(linkEle, link)
      doc.head.appendChild(linkEle)
    })
    const docStyles = CoreEditor.cssMin([componentStyles, ...(options.styleSheets || [])].join(''))
    const styleEl = doc.createElement('style')
    styleEl.innerHTML = CoreEditor.cssMin([...docStyles, ...(options.editingStyleSheets || [])].join(''))
    doc.head.append(styleEl)
  }

  private getAllComponentResources() {
    const resources: Array<{ componentName: string, resources: ComponentResources }> = []
    this.options.componentLoaders?.forEach(i => {
      if (i.resources) {
        resources.push({
          componentName: i.component.name,
          resources: i.resources
        })
      }
    })

    return resources
  }

  private createLayout() {
    const workbench = createElement('div', {
      styles: {
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100%',
        background: '#fff'
      }
    })

    const iframe = CoreEditor.createEditableFrame()
    workbench.appendChild(iframe)

    return new Promise<{
      workbench: HTMLElement,
      iframe: HTMLIFrameElement,
      document: Document
    }>(resolve => {
      const html = getIframeHTML()
      iframe.onload = () => {
        const doc = iframe.contentDocument!
        doc.open()
        doc.write(html)
        doc.close()
        resolve({
          workbench,
          iframe,
          document: doc
        })
      }
      this.docContainer.appendChild(workbench)
    })
  }

  private static createEditableFrame() {
    return createElement('iframe', {
      attrs: {
        scrolling: 'no'
      },
      styles: {
        border: 'none',
        width: '100%',
        display: 'block',
        minHeight: '100%'
      }
    }) as HTMLIFrameElement
  }

  private static cssMin(str: string) {
    return str
      .replace(/\s*(?=[>{}:;,[])/g, '')
      .replace(/([>{}:;,])\s*/g, '$1')
      .replace(/;}/g, '}').replace(/\s+/, ' ').trim()
  }
}
