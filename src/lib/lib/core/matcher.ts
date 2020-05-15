import { AbstractData } from './abstract-data';
import { HighlightState } from '../toolbar/help';
import { TBRange } from '../viewer/range';

/**
 * 匹配到的抽象数据及状态
 */
interface MatchData {
  state: MatchState;
  abstractData: AbstractData;
}

/**
 * 一段内容通过 Rule 规则匹配后的结果状态
 */
export enum MatchState {
  Valid = 'Valid',
  Invalid = 'Invalid',
  Exclude = 'Exclude',
  Inherit = 'Inherit'
}

/**
 * 匹配规则
 */
export interface MatchRule {
  /** 匹配的标签 */
  tags?: string[] | RegExp;
  /** 匹配的样式 */
  styles?: { [key: string]: number | string | RegExp | Array<number | string | RegExp> };
  // classes?: string[];
  /** 匹配的属性 */
  attrs?: Array<{ key: string; value?: string | string[] }>;
  /** 可继承样式的标签，如加粗，可继承自 h1~h6 */
  extendTags?: string[] | RegExp;
  /** 排除的样式 */
  excludeStyles?: { [key: string]: number | string | RegExp | Array<number | string | RegExp> };
  // excludeClasses?: string[];
  /** 排除的属性 */
  excludeAttrs?: Array<{ key: string; value?: string | string[] }>;
  /** 不能包含哪些标签 */
  noContainTags?: string[] | RegExp;
  /** 不能在哪些标签之内 */
  noInTags?: string[] | RegExp;
  /** 自定义过滤器，以适配以上不能满足的特殊需求 */
  filter?: (node: HTMLElement | AbstractData) => boolean;
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
