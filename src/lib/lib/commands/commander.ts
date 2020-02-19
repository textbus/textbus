import { MatchState } from '../matcher/matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { AbstractData } from '../parser/abstract-data';
import { RootFragment } from '../parser/root-fragment';
import { VElement } from '../renderer/element';

/**
 * 丢弃前一个 Format 渲染的结果，并用自己代替
 */
export class ReplaceModel {
  constructor(public replaceElement: VElement) {
  }
}

/**
 * 把当前的渲染结果作为插槽返回，并且把后续的渲染结果插入在当前节点内
 */
export class ChildSlotModel {
  constructor(public slotElement: VElement) {
  }
}

export type RenderModel = ReplaceModel | ChildSlotModel | null;

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
   * @param handler 当前触发调用的 `Handler` 工具类
   * @param overlap 根据当前选区和 `Handler` 工具类的 `Matcher` 匹配出的结果得到的状态，`true` 为完全重叠，`false` 为不完全重叠或不重叠
   * @param rootFragment 当前文档的根片段
   */
  command(selection: TBSelection, handler: Handler, overlap: boolean, rootFragment: RootFragment): void;

  /**
   * 根据抽象数据返回虚拟节点
   * @param state 当前节点的状态
   * @param abstractData 当前节点的抽象数据
   * @param rawElement 前一个 `Format` 的渲染结果
   */
  render(state: MatchState, abstractData: AbstractData, rawElement?: VElement): RenderModel;
}
