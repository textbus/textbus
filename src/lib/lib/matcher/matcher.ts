import { TBSelection } from '../viewer/selection';
import { Renderer } from '../core/renderer';
import { AbstractData } from '../core/abstract-data';
import { HighlightState } from '../toolbar/help';
import { TBRange } from '../viewer/range';
import { MatchState } from '../core/formatter';
import { Editor } from '../editor';

/**
 * 匹配到的抽象数据及状态
 */
export interface MatchData {
  state: MatchState;
  abstractData: AbstractData;
}

/**
 * 一个 Range 匹配出的结果详情
 */
export interface RangeMatchDelta {
  state: HighlightState;
  fromRange: TBRange;
  abstractData: AbstractData;
}

/**
 * Selection 对象内所有 Range 匹配出的结果详情
 */
export interface SelectionMatchDelta {
  state: HighlightState;
  srcStates?: RangeMatchDelta[];
  abstractData?: AbstractData;
}

export type Constructor<T> = { new(...args: any): T };

export interface Matcher {
  queryState(selection: TBSelection, renderer: Renderer, editor: Editor): SelectionMatchDelta;
}
