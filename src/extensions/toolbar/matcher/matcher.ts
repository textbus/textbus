import { Injector } from '@tanbo/di';

import {
  TBSelection,
  FormatData,
  TBRange,
  FormatEffect,
  AbstractComponent
} from '../../../lib/core/_api';
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

export interface Matcher {
  setup?(injector: Injector): void;

  onDestroy?(): void;

  queryState(selection: TBSelection): SelectionMatchState;
}
