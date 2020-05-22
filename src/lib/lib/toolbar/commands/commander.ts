import { TBSelection } from '../../viewer/selection';
import { Renderer } from '../../core/renderer';

/**
 * 操作编辑器的命令工具
 */
export interface Commander<T = any> {
  /**
   * 当调用 command 方法时，是否把操作前的数据存入历史栈
   */
  recordHistory: boolean;

  /**
   * 如果实例有该方法，则调用 `command` 方法之前调用，主要用于部分 `Commander` 使用不固定值的接口
   * 如：设置字体颜色，则需要根据用户选择的颜色值，来确定当调用 `command` 方法时，使用什么颜色
   * @param value 当前要给 `Commander` 实例设置的值
   */
  updateValue?(value: T): void;

  /**
   * 格式化文档的方法
   * @param selection 当前用户操作的选区
   * @param overlap 根据当前选区和工具类的 `Matcher` 匹配出的结果得到的状态，`true` 为完全重叠，`false` 为不完全重叠或不重叠
   * @param renderer 渲染器
   */
  command(selection: TBSelection, overlap: boolean, renderer: Renderer): void;
}
