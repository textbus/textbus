import { ComponentLiteral } from '@textbus/core'
import { Injector, Provider } from '@tanbo/di'

import { FormatLoader, ComponentLoader } from '../dom-support/parser'

/**
 * TextBus PC 端插件接口
 */
export interface Plugin {
  /**
   * 编辑器初始化时调用的勾子
   * @param injector 访问 TextBus 内部实例的 IoC 容器
   */
  setup(injector: Injector): void

  /**
   * 当编辑器销毁时调用
   */
  onDestroy?(): void
}

/**
 * TextBus PC 端配置接口
 */
export interface BaseEditorOptions {
  /** 组件加载器 */
  componentLoaders?: ComponentLoader[]
  /** 格式加载器 */
  formatLoaders?: FormatLoader[]
  /** 默认内容 */
  content?: string | ComponentLiteral
  /** 文档默认样式表 */
  styleSheets?: string[]
  /** 配置文档编辑状态下用到的样式 */
  editingStyleSheets?: string[];
  /** 插件 */
  plugins?: Plugin[]
  /** 提供者集合，数组内配置的类，可以使用 TextBus 中的依赖注入能力 */
  providers?: Provider[]
}
