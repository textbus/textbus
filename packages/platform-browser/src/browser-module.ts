import {
  ComponentConstructor,
  Component,
  ComponentLiteral,
  FocusManager,
  makeError,
  Module,
  NativeSelectionBridge,
  Registry,
  Textbus,
  ViewAdapter
} from '@textbus/core'
import { Provider } from '@viewfly/core'
import { distinctUntilChanged, map, Subject } from '@tanbo/stream'

import { AttributeLoader, ComponentLoader, FormatLoader, Parser } from './parser'
import { EDITOR_OPTIONS, VIEW_CONTAINER, VIEW_DOCUMENT, VIEW_MASK } from './injection-tokens'
import { SelectionBridge } from './selection-bridge'
import { Input } from './types'
import { MagicInput } from './magic-input'
import { CollaborateCursor } from './collaborate-cursor'
import { createElement } from './_utils/uikit'
import { DomAdapter } from './dom-adapter'
import { NativeInput } from './native-input'

const browserErrorFn = makeError('BrowserModule')

/**
 * Textbus PC 端配置接口
 */
export interface ViewOptions {
  /** 渲染平台适配器 */
  adapter: DomAdapter<any, any>

  /** 编辑器根节点 */
  renderTo(): HTMLElement

  /** 自动获取焦点 */
  autoFocus?: boolean
  /** 编辑区最小高度 */
  minHeight?: string
  /** 组件加载器 */
  componentLoaders?: ComponentLoader[]
  /** 格式加载器 */
  formatLoaders?: FormatLoader<any>[]
  /** 属性加载器 */
  attributeLoaders?: AttributeLoader<any>[]
  /** 使用 contentEditable 作为编辑器控制可编辑范围 */
  useContentEditable?: boolean
}

export class BrowserModule implements Module {
  providers: Provider[]

  private workbench!: HTMLElement

  constructor(public config: ViewOptions) {
    const { mask, wrapper } = BrowserModule.createLayout()
    wrapper.prepend(config.adapter.host)
    if (config.minHeight) {
      config.adapter.host.style.minHeight = config.minHeight
    }
    this.providers = [{
      provide: EDITOR_OPTIONS,
      useValue: config
    }, {
      provide: VIEW_CONTAINER,
      useValue: wrapper
    }, {
      provide: VIEW_DOCUMENT,
      useValue: config.adapter.host
    }, {
      provide: VIEW_MASK,
      useValue: mask
    }, {
      provide: NativeSelectionBridge,
      useExisting: SelectionBridge
    }, {
      provide: Input,
      useClass: config.useContentEditable ? NativeInput : MagicInput
    }, {
      provide: ViewAdapter,
      useFactory(v) {
        return v
      },
      deps: [DomAdapter]
    }, {
      provide: DomAdapter,
      useValue: config.adapter
    }, {
      provide: FocusManager,
      useFactory: (input: Input): FocusManager => {
        const focusEvent = new Subject<void>()
        const blurEvent = new Subject<void>()
        input.caret.onPositionChange.pipe(
          map(p => !!p),
          distinctUntilChanged()
        ).subscribe(b => {
          if (b) {
            focusEvent.next()
          } else {
            blurEvent.next()
          }
        })
        return {
          onFocus: focusEvent,
          onBlur: blurEvent
        }
      },
      deps: [Input]
    },
      Parser,
      SelectionBridge,
      CollaborateCursor
    ]

    this.workbench = wrapper
  }

  /**
   * 解析 HTML 并返回一个组件实例
   * @param html 要解析的 HTML
   * @param rootComponentLoader 文档根组件加载器
   * @param textbus
   */
  readDocumentByHTML(html: string, rootComponentLoader: ComponentLoader, textbus: Textbus): Component {
    const parser = textbus.get(Parser)
    const doc = parser.parseDoc(html, rootComponentLoader)
    if (doc instanceof Component) {
      return doc
    }
    throw browserErrorFn('rootComponentLoader must return a component instance.')
  }

  /**
   * 将组件数据解析到组件实例中
   * @param data 要解析的 JSON 数据
   * @param rootComponent 根组件
   * @param textbus
   */
  readDocumentByComponentLiteral(data: ComponentLiteral, rootComponent: ComponentConstructor, textbus: Textbus): Component {
    const registry = textbus.get(Registry)
    return registry.createComponentByFactory(data, rootComponent)
  }

  setup() {
    const host = this.config.renderTo()
    if (!(host instanceof HTMLElement)) {
      throw browserErrorFn('view container is not a HTMLElement')
    }
    host.append(this.workbench)
    return () => {
      this.workbench.remove()
    }
  }

  onAfterStartup(textbus: Textbus) {
    if (this.config.autoFocus) {
      textbus.focus()
    }
  }

  private static createLayout() {
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
      children: [mask]
    })
    return {
      wrapper,
      mask
    }
  }
}
