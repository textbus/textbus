import { Observable } from 'rxjs';
import { Provider, Type } from '@tanbo/di';

import { AbstractComponent, Formatter } from './core/_api';
import { OutputTranslator } from './output-translator';
import { TextBusUI } from './ui';

/**
 * TextBus 初始化时的配置参数
 */
export interface EditorOptions<T> {
  /** 设置主题 */
  theme?: string;
  /** 设置最大历史栈 */
  historyStackSize?: number;
  /** 声明组件集合 */
  components?: Array<Type<AbstractComponent>>;
  /** 设置格式转换器 */
  formatters?: Formatter[];
  /** 配置文档的默认样式 */
  styleSheets?: string[];
  /** 配置文档编辑状态下用到的样式 */
  editingStyleSheets?: string[];
  /** 设置初始化 TextBus 时的默认内容 */
  contents?: string;
  /** 设置输出转换器 */
  outputTranslator?: OutputTranslator<T>;
  /** 配置自定义服务，以替换 TextBus 默认类 */
  providers?: Provider[];
  /** UI 配置 */
  ui?: TextBusUI[];

  /** 当某些工具需要上传资源时的调用函数，调用时会传入上传资源的类型，如 image、video、audio等，该函数返回一个字符串，作为资源的 url 地址 */
  uploader?(type: string): (string | Promise<string> | Observable<string>);
}
