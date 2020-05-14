import { AbstractData } from './abstract-data';
import { VElement } from './element';
import { ChildSlotModel, Renderer, ReplaceModel } from './renderer';
import { TBSelection } from '../viewer/selection';
import { HighlightState } from '../toolbar/help';
import { TBRange } from '../viewer/range';
import { Fragment } from './fragment';
import { Template } from './template';

export interface EditableOptions {
  /** 设置是否要编辑标签 */
  tag?: boolean;
  /** 设置要编辑的 HTML 属性 */
  attrs?: string[];
  /** 设置要编辑的 Style */
  styleName?: string;
}

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

export interface FormatRange {
  startIndex: number;
  endIndex: number;
  abstractData: AbstractData;
  renderer: Formatter;
  state: MatchState;
}

export abstract class Formatter {
  private inheritValidators: Array<(node: HTMLElement | AbstractData) => boolean> = [];
  private validators: Array<(node: HTMLElement | AbstractData) => boolean> = [];
  private excludeValidators: Array<(node: HTMLElement | AbstractData) => boolean> = [];

  protected constructor(private rule: MatchRule) {
    if (rule.extendTags) {
      this.inheritValidators.push(this.makeTagsMatcher(rule.extendTags));
    }
    if (rule.tags) {
      this.validators.push(this.makeTagsMatcher(rule.tags));
    }
    // if (rule.classes) {
    //   this.validators.push(this.makeClassNameMatcher(rule.classes));
    // }
    if (rule.styles) {
      this.validators.push(this.makeStyleMatcher(rule.styles));
    }
    if (rule.attrs) {
      this.validators.push(this.makeAttrsMatcher(rule.attrs));
    }
    // if (rule.excludeClasses) {
    //   this.excludeValidators.push(this.makeClassNameMatcher(rule.excludeClasses));
    // }
    if (rule.excludeStyles) {
      this.excludeValidators.push(this.makeStyleMatcher(rule.excludeStyles));
    }
    if (rule.excludeAttrs) {
      this.excludeValidators.push(this.makeAttrsMatcher(rule.excludeAttrs));
    }
  }

  abstract read(node: HTMLElement): AbstractData;

  abstract render(state: MatchState, abstractData: AbstractData, existingElement?: VElement): ReplaceModel | ChildSlotModel | null;

  match(p: HTMLElement | AbstractData) {
    if (this.rule.filter) {
      const b = this.rule.filter(p);
      if (!b) {
        return MatchState.Invalid;
      }
    }
    const exclude = this.excludeValidators.map(fn => fn(p)).includes(true);
    if (exclude) {
      return MatchState.Exclude;
    }
    const inherit = this.inheritValidators.map(fn => fn(p)).includes(true);
    if (inherit) {
      return MatchState.Inherit;
    }
    return this.validators.map(fn => fn(p)).includes(true) ? MatchState.Valid : MatchState.Invalid;
  }

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchDelta {
    if (!selection.rangeCount) {
      return {
        srcStates: [],
        state: HighlightState.Normal,
        abstractData: null
      };
    }
    const srcStates: RangeMatchDelta[] = selection.ranges.map(range => {

      const isDisable = this.getDisableStateByRange(range, renderer);

      if (isDisable) {
        return {
          state: HighlightState.Disabled,
          fromRange: range,
          abstractData: null
        };
      }

      const states: MatchData[] = [];
      range.getSelectedScope().forEach(s => {
        const state = this.getStatesByRange(s.startIndex,
          s.endIndex,
          s.fragment);
        if (state.state === MatchState.Invalid) {
          const inSingleContainer = this.inSingleContainer(renderer, s.fragment, s.startIndex, s.endIndex);
          if (inSingleContainer.state !== MatchState.Invalid) {
            states.push(inSingleContainer);
          } else {
            states.push(state);
          }
        } else {
          states.push(state);
        }
      });
      let mergedState = Formatter.mergeStates(states) || {state: MatchState.Invalid, abstractData: null};
      return {
        state: (mergedState.state === MatchState.Valid || mergedState.state === MatchState.Inherit) ?
          HighlightState.Highlight : HighlightState.Normal,
        fromRange: range,
        abstractData: mergedState.abstractData
      };
    });
    let isDisable = false;
    for (const i of srcStates) {
      if (i.state === HighlightState.Disabled) {
        isDisable = true;
        break;
      }
    }

    return {
      state: isDisable ? HighlightState.Disabled :
        srcStates.reduce((v, n) => v && n.state === HighlightState.Highlight, true) ?
          HighlightState.Highlight :
          HighlightState.Normal,
      srcStates,
      abstractData: srcStates[0].abstractData
    };
  }

  private getStatesByRange(startIndex: number, endIndex: number, fragment: Fragment): MatchData {
    let formatRanges = fragment.getFormatRangesByFormatter(this) || [];

    if (startIndex === endIndex) {
      for (const format of formatRanges) {
        const matchBegin = startIndex === 0 ? startIndex >= format.startIndex : startIndex > format.startIndex;
        const matchClose = endIndex < format.endIndex;
        if (matchBegin && matchClose) {
          return {
            state: format.state,
            abstractData: format?.abstractData.clone() || null
          };
        }
      }
      return {
        state: MatchState.Invalid,
        abstractData: null
      };
    }

    const childContents = fragment.sliceContents(startIndex, endIndex);
    const states: Array<MatchData> = [];
    let index = startIndex;
    formatRanges = formatRanges.filter(item => {
      return !(item.endIndex <= startIndex || item.startIndex >= endIndex);
    });

    for (const child of childContents) {
      if (typeof child === 'string') {
        for (const format of formatRanges) {
          if (index >= format.startIndex && index + child.length <= format.endIndex) {
            if (format.state === MatchState.Exclude) {
              return {
                state: MatchState.Exclude,
                abstractData: format?.abstractData.clone() || null
              };
            } else {
              states.push({
                state: format.state,
                abstractData: format?.abstractData.clone() || null
              });
            }
          } else {
            states.push({
              state: MatchState.Invalid,
              abstractData: null
            })
          }
        }
        if (!formatRanges.length) {
          return {
            state: MatchState.Invalid,
            abstractData: null
          };
        }
      } else if (child instanceof Fragment) {
        if (child.contentLength) {
          states.push(this.getStatesByRange(0, child.contentLength, child));
        }
      }
      index += child.length;
    }
    return Formatter.mergeStates(states);
  }

  private getDisableStateByRange(range: TBRange, renderer: Renderer) {
    return this.isInTag(range.commonAncestorFragment, renderer) ||
      this.isContainTag(range.commonAncestorFragment, renderer, range.getCommonAncestorFragmentScope());
  }

  private isInTag(fragment: Fragment, renderer: Renderer): boolean {
    if (!fragment) {
      return false;
    }
    return this.isDisable(fragment, this.rule.noInTags) || this.isInTag(
      renderer.getParentFragmentByTemplate(renderer.getParentTemplateByFragment(fragment)),
      renderer
    );
  }

  private isContainTag(fragment: Fragment, renderer: Renderer, position: { startIndex: number, endIndex: number }): boolean {
    const templates: Template[] = fragment.sliceContents(position.startIndex, position.endIndex)
      .filter(item => item instanceof Template) as Template[];
    const elements: Fragment[] = [];
    templates.forEach(t => {
      elements.push(...t.childSlots);
    });
    for (let el of elements) {
      if (this.isDisable(el, this.rule.noContainTags) ||
        this.isContainTag(el, renderer, {startIndex: 0, endIndex: el.contentLength})) {
        return true;
      }
    }
    return false;
  }

  private isDisable(fragment: Fragment, tags: string[] | RegExp) {
    const formats = fragment.getFormatRanges();

    for (const f of formats) {
      if (f.abstractData) {
        if (Array.isArray(tags)) {
          if (tags.includes(f.abstractData.tag)) {
            return true;
          }
        } else if (tags instanceof RegExp) {
          if (tags.test(f.abstractData.tag)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  protected extractData(node: HTMLElement, config: EditableOptions): AbstractData {
    if (!config) {
      return new AbstractData();
    }
    const attrs = new Map<string, string>();
    if (config.attrs) {
      config.attrs.forEach(key => {
        attrs.set(key, node.getAttribute(key));
      });
    }
    let style: { name: string, value: string } = null;
    if (config.styleName) {
      const v = node.style[config.styleName];
      if (v) {
        style = {
          name: config.styleName,
          value: v
        };
      }
    }
    return new AbstractData({
      tag: config.tag ? node.nodeName.toLowerCase() : null,
      attrs: attrs.size ? attrs : null,
      style
    });
  }

  private makeTagsMatcher(tags: string[] | RegExp) {
    return (node: HTMLElement | AbstractData) => {
      const tagName = node instanceof AbstractData ? node.tag : node.nodeName.toLowerCase();
      return Array.isArray(tags) ? tags.includes(tagName) : tags.test(tagName);
    };
  }

  private makeAttrsMatcher(attrs: Array<{ key: string; value?: string | string[] }>) {
    return (node: HTMLElement | AbstractData) => {
      return attrs.map(attr => {
        if (attr.value) {
          if (node instanceof AbstractData) {
            return node?.attrs.get(attr.key) === attr.value;
          }
          if (node instanceof HTMLElement) {
            return node.getAttribute(attr.key) === attr.value;
          }
        } else {
          if (node instanceof AbstractData) {
            return node?.attrs.has(attr.key);
          }
          if (node instanceof HTMLElement) {
            return node.hasAttribute(attr.key);
          }
        }
        return false;
      }).includes(true);
    }
  }

  private makeStyleMatcher(styles: { [key: string]: number | string | RegExp | Array<number | string | RegExp> }) {
    return (node: HTMLElement | AbstractData) => {
      const elementStyles = node.style;
      if (!elementStyles) {
        return false;
      }
      return !Object.keys(styles).map(key => {
        const optionValue = (Array.isArray(styles[key]) ?
          styles[key] :
          [styles[key]]) as Array<string | number | RegExp>;
        let styleValue = node instanceof AbstractData ?
          (node.style.name === key ? node.style.value + '' : '') :
          elementStyles[key];
        if (key === 'fontFamily' && typeof styleValue === 'string') {
          styleValue = styleValue.replace(/['"]/g, '');
        }
        if (styleValue) {
          return optionValue.map(v => {
            if (v instanceof RegExp) {
              return v.test(styleValue);
            }
            return v === styleValue;
          }).includes(true);
        }
        return false;
      }).includes(false);
    }
  }

  private inSingleContainer(renderer: Renderer, fragment: Fragment, startIndex: number, endIndex: number): MatchData {

    while (true) {
      const formatRanges = fragment.getFormatRangesByFormatter(this) || [];
      const states: FormatRange[] = [];
      for (const f of formatRanges) {
        if (startIndex === endIndex && f.startIndex === f.endIndex && startIndex === f.startIndex) {
          states.push(f);
        } else {
          const matchBegin = startIndex === 0 ?
            startIndex >= f.startIndex :
            startIndex > f.startIndex;
          const matchClose = endIndex <= f.endIndex;
          if (matchBegin && matchClose) {
            states.push(f);
          }
        }
      }

      for (const item of states) {
        if (item.state === MatchState.Exclude) {
          return {
            state: MatchState.Exclude,
            abstractData: item.abstractData.clone()
          }
        }
      }
      for (const item of states) {
        if (item.state === MatchState.Valid) {
          return {
            state: MatchState.Valid,
            abstractData: item.abstractData.clone()
          }
        }
      }

      const parentTemplate = renderer.getParentTemplateByFragment(fragment);
      const parentFragment = renderer.getParentFragmentByTemplate(parentTemplate);
      if (parentFragment) {
        startIndex = parentFragment.sliceContents(0).indexOf(parentTemplate);
        endIndex = startIndex + 1;
        fragment = parentFragment;
      } else {
        break;
      }
    }
    return {
      state: MatchState.Invalid,
      abstractData: null
    };
  }

  private static mergeStates(states: MatchData[]): MatchData {
    states = states.filter(i => i);
    for (const item of states) {
      if (item.state === MatchState.Exclude) {
        return {
          state: MatchState.Exclude,
          abstractData: item.abstractData ? item.abstractData.clone() : null
        };
      } else if (item.state === MatchState.Invalid) {
        return {
          state: MatchState.Invalid,
          abstractData: item.abstractData ? item.abstractData.clone() : null
        };
      }
    }

    const last = states[states.length - 1];
    let equal = true;
    for (let i = 1; i < states.length; i++) {
      const b = states[0].abstractData.equal(states[i].abstractData);
      if (!b) {
        equal = false;
        break;
      }
    }

    return states.length ? {
      state: last.state,
      abstractData: states.length && equal ? last.abstractData.clone() : null
    } : null;
  }
}
