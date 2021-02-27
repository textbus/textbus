import { Observable } from 'rxjs';
import { Type } from '@tanbo/di';

import { AbstractComponent, Formatter, TBPlugin } from './core/_api';
import { OutputTranslator } from './output-translator';
import { ComponentCreator, DeviceOption } from './workbench/_api';
import { ToolFactory } from './toolbar/_api';

/**
 * TextBus 初始化时的配置参数
 */
export interface EditorOptions<T> {
  /** 设置主题 */
  theme?: string;
  /** 配置设备选项 */
  deviceOptions?: DeviceOption[];
  /** 指定设备类型 */
  deviceType?: string;
  /** 默认是否全屏*/
  fullScreen?: boolean;
  /** 默认是否展开组件库 */
  expandComponentLibrary?: boolean;
  /** 设置最大历史栈 */
  historyStackSize?: number;
  /** 声明组件集合 */
  components?: Array<Type<AbstractComponent>>;
  /** 设置格式转换器 */
  formatters?: Formatter[];
  /** 工具条配置 */
  toolbar?: (ToolFactory | ToolFactory[])[];
  /** 扩展增强插件 */
  plugins?: TBPlugin[];
  /** 配置文档的默认样式 */
  styleSheets?: string[];
  /** 配置文档编辑状态下用到的样式 */
  editingStyleSheets?: string[];
  /** 设置初始化 TextBus 时的默认内容 */
  contents?: string;
  /** 设置可选的自定义组件 */
  componentLibrary?: ComponentCreator[];
  /** 设置输出转换器 */
  outputTranslator?: OutputTranslator<T>;

  /** 当某些工具需要上传资源时的调用函数，调用时会传入上传资源的类型，如 image、video、audio等，该函数返回一个字符串，作为资源的 url 地址 */
  uploader?(type: string): (string | Promise<string> | Observable<string>);
}
