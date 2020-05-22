import { TBSelection } from '../../viewer/selection';
import { Renderer } from '../../core/renderer';
import { FormatAbstractData } from '../../core/format-abstract-data';
import { HighlightState } from '../help';
import { TBRange } from '../../viewer/range';
import { FormatEffect } from '../../core/formatter';
import { Editor } from '../../editor';
import { Template } from '../../core/template';

/**
 * 匹配到的抽象数据及状态
 */
export interface FormatMatchData {
  effect: FormatEffect;
  srcData: FormatAbstractData;
}

/**
 * 一个 Range 匹配出的结果详情
 */
export interface RangeMatchDelta<T> {
  state: HighlightState;
  fromRange: TBRange;
  srcData: T;
}

/**
 * Selection 对象内所有 Range 匹配出的结果详情
 */
export interface SelectionMatchDelta<T = FormatAbstractData | Template> {
  state: HighlightState;
  srcStates: RangeMatchDelta<T>[];
  matchData: T;
}

export interface Matcher {
  queryState(selection: TBSelection, renderer: Renderer, editor: Editor): SelectionMatchDelta;
}
