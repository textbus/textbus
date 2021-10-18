import { Observable } from 'rxjs';
import { Provider, Type } from '@tanbo/di';

import { AbstractComponent, Formatter } from './core/_api';
import { TBPlugin } from './plugin';
import { I18NConfig } from './i18n/i18n';

/**
 * TextBus 初始化时的配置参数
 */
export interface EditorOptions {
  /** 设置主题 */
  theme?: string;
  /** 设置最大历史栈, 默认值为50个 */
  historyStackSize?: number;
  /** 设置记录历史的时间间隔，间隔期间内如有变化则会添加一次历史记录, 默认值为5000ms */
  historySampleTime?: number;
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
  /** 配置自定义服务 */
  providers?: Provider[];
  /** 插件配置 */
  plugins?: Type<TBPlugin>[];
  /** 国际化配置 */
  i18n?: I18NConfig;
  /** 当某些工具需要上传资源时的调用函数，调用时会传入上传资源的类型，如 image、video、audio等，该函数返回一个字符串，作为资源的 url 地址 */
  uploader?(type: string, currentValue?: string): (string | Promise<string> | Observable<string>);
  /** 当用户保存时的回调，一般为 ctrl + s 快捷键 */
  onSave?(): void;
}
