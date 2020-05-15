import { TBSelection } from '../viewer/selection';
import { Template } from '../core/template';
import { Renderer } from '../core/renderer';
import { AbstractData } from '@tanbo/tbus/core/abstract-data';
import { HighlightState } from '@tanbo/tbus/toolbar/help';
import { TBRange } from '@tanbo/tbus/viewer/range';
import { MatchState } from '@tanbo/tbus/core/formatter';

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
  srcStates: RangeMatchDelta[];
  abstractData: AbstractData;
}

export type Constructor<T> = { new(...args: any): T };

export abstract class TemplateMatcher<T extends Template> {
  abstract get templateConstructor(): Constructor<T>;

  abstract queryState(selection: TBSelection, renderer: Renderer): boolean;
}
