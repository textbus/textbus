import {
  Injector,
  TBSelection,
  FormatData,
  TBRange,
  FormatEffect,
  AbstractComponent
} from '@textbus/core';

import { HighlightState } from '../help';

/**
 * 匹配到的抽象数据及状态
 */
export interface FormatMatchData {
  effect: FormatEffect;
  srcData: FormatData;
}

/**
 * 一个 Range 匹配出的结果详情
 */
export interface RangeMatchState<T> {
  state: HighlightState;
  fromRange: TBRange;
  srcData: T;
}

/**
 * Selection 对象内所有 Range 匹配出的结果详情
 */
export interface SelectionMatchState<T = FormatData | AbstractComponent> {
  state: HighlightState;
  srcStates: RangeMatchState<T>[];
  matchData: T;
}

/**
 * 状态查询器
 */
export interface Matcher {
  /**
   * 工具条初始化时调用
   * @param injector 获取 TextBus 内部类的注入器
   */
  setup?(injector: Injector): void;

  /**
   * 工具条销毁时调用
   */
  onDestroy?(): void;

  /**
   * 状态查询方法，返回查询后的状态
   * @param selection TextBus 的 selection 对象
   */
  queryState(selection: TBSelection): SelectionMatchState;
}
