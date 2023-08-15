import { ComponentLiteral, Module, NativeSelectionBridge, ViewAdapter } from '@textbus/core'
import { Provider } from '@viewfly/core'

import { AttributeLoader, ComponentLoader, FormatLoader, Parser } from './parser'
import { EDITOR_OPTIONS, VIEW_CONTAINER, VIEW_DOCUMENT, VIEW_MASK } from './injection-tokens'
import { SelectionBridge } from './selection-bridge'
import { Input } from './types'
import { MagicInput } from './magic-input'
import { CollaborateCursor } from './collaborate-cursor'
import { createElement } from './_utils/uikit'
import { DomAdapter } from './dom-adapter'
import { NativeInput } from './native-input'

/**
 * Textbus PC 端配置接口
 */
export interface ViewOptions {
  adapter: DomAdapter<any, any>
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
  /** 默认内容 */
  content?: string | ComponentLiteral
  /** 使用 contentEditable 作为编辑器控制可编辑范围 */
  useContentEditable?: boolean
}

export class BrowserModule implements Module {
  providers: Provider[]

  private workbench!: HTMLElement

  constructor(public host: HTMLElement, public config: ViewOptions) {
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
    },
      Parser,
      SelectionBridge,
      CollaborateCursor
    ]

    this.workbench = wrapper
    this.host.append(wrapper)
  }

  onDestroy() {
    this.workbench.remove()
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
