import { TBSelection } from './selection';
import { Renderer } from './renderer';
import { Fragment } from './fragment';

/**
 * 操作编辑器的命令工具
 */
export interface Commander<T = any> {
  /**
   * 当调用 command 方法时，是否把操作前的数据存入历史栈
   */
  recordHistory: boolean;
  /**
   * 格式化文档的方法
   * @param selection 当前用户操作的选区
   * @param params 执行当前命令所需要的参数，大多数情况下，由菜单栏工具生成，也可以通过生命周期生成。
   * @param overlap 根据当前选区和工具类的 `Matcher` 匹配出的结果得到的状态，`true` 为完全重叠，`false` 为不完全重叠或不重叠
   * @param renderer 渲染器
   * @param rootFragment 根编辑片段
   */
  command(selection: TBSelection, params: T, overlap: boolean, renderer: Renderer, rootFragment: Fragment): void;
}
