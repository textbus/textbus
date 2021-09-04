import { Injector, TBSelection } from '@textbus/core';

/**
 * 调用 command 命令时的实时上下文本
 */
export interface CommandContext {
  /** 当前用户操作的选区 */
  selection: TBSelection;
  /** 根据当前选区和工具类的 `Matcher` 匹配出的结果得到的状态，`true` 为完全重叠，`false` 为不完全重叠或不重叠 */
  overlap: boolean;
}

/**
 * 操作编辑器的命令工具
 */
export interface Commander<T = any> {
  /**
   * 当调用 command 方法后，是否把当前操作存入历史栈
   */
  recordHistory: boolean;

  /**
   * 工具条初始化时调用
   * @param injector 用于获取 TextBus 内部实例有注入器
   */
  setup?(injector: Injector): void;

  /**
   * 当工具条销毁时调用
   */
  onDestroy?(): void;

  /**
   * 格式化文档的方法
   * @param context 格式化上下文
   * @param params 执行当前命令所需要的参数，大多数情况下，由菜单栏工具生成，也可以通过生命周期生成。
   */
  command(context: CommandContext, params: T): void;
}
