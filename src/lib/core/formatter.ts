import { FormatData } from './format-data';
import { VElement } from './element';
import { ChildSlotMode, ReplaceMode } from './renderer';

export interface EditableOptions {
  /** 设置是否要编辑标签 */
  tag?: boolean;
  /** 设置要编辑的 HTML 属性 */
  attrs?: string[];
  /** 设置要编辑的 Style */
  styleName?: string | string[];
}

/**
 * 用于标识格式在 DOM 元素上应用的状态。
 */
export enum FormatEffect {
  /** 生效的 */
  Valid = 'Valid',
  /** 不生效的 */
  Invalid = 'Invalid',
  /** 排除 */
  Exclude = 'Exclude',
  /** 继承 */
  Inherit = 'Inherit'
}

/**
 * 配置一段格式的参数。
 */
export type BlockFormatParams = {
  formatData: FormatData;
  effect: FormatEffect;
};

export type InlineFormatParams = {
  formatData: FormatData;
  effect: FormatEffect;
  startIndex: number;
  endIndex: number;
}

/**
 * 标识一段格式的范围。
 */
export interface FormatRange {
  startIndex: number;
  endIndex: number;
  formatData: FormatData;
  effect: FormatEffect;
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
  /** 自定义过滤器，以适配以上不能满足的特殊需求 */
  filter?: (node: HTMLElement | FormatData) => boolean;
}

/**
 * 标识格式渲染优先级。
 */
export enum FormatterPriority {
  BlockStyle = 0,
  InlineTag = 100,
  InlineStyle = 200,
  Attribute = 300
}

/**
 * 当 TextBus 渲染样式时，会调用 Formatter 类 render 方法，并传入渲染的上下文。
 */
export interface FormatRendingContext {
  /**
   * 是否是输出模式，有些情况下，编辑模式和输出模式渲染的结果是需要不一样的。
   * 如在编辑状态下，可能会添加一些临时的属性来做交互，或者兼听一些事件等等，
   * 这在输出结果时，是不需要的。
   */
  isOutputMode: boolean;
  /**
   * 当前样式的状态，一般来说有两种，生效的（Valid）和不生效的（Invalid），有些情况下，可能还有其它状态。
   * 如：继承（Inherit）、排除（Exclude）。
   * 如果当前是状态是 Invalid，是不会调用 render 方法的，只有是其它三种中的一种才会调用。
   * Formatter 在渲染的时候，可以根据不同的状态来渲染出不同的结果。
   */
  effect: FormatEffect;
  /**
   * 渲染时需要的抽象数据，当外部改变了部分样式时，修改后的值都会保存在抽象的数据中。
   */
  formatData: FormatData;
}

/**
 * TextBus 格式基类，在扩展格式时，不能直接继承 Formatter，请继承 InlineFormatter、BlockFormatter 或其它子类。
 */
export abstract class Formatter {
  private inheritValidators: Array<(node: HTMLElement | FormatData) => boolean> = [];
  private validators: Array<(node: HTMLElement | FormatData) => boolean> = [];
  private excludeValidators: Array<(node: HTMLElement | FormatData) => boolean> = [];

  protected constructor(protected rule: MatchRule, public priority: number) {

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

  /**
   * 读到 DOM 节点，并返回转换后抽象格式数据。
   * @param node
   */
  abstract read(node: HTMLElement): FormatData;

  /**
   * 当 TextBus 渲染样式时，会调用 Formatter 类 render 方法，并根据 render 方法返回的渲染模式，处理虚拟 DOM 结构。
   * @param context         渲染上下文本
   * @param existingElement 是否已有同级元素。如：当两个样式的范围是一样的，其中一个样式先渲染时，第二个样式
   *                        渲染时，则会拿到第一个样式渲染后的元素。
   * @return                ReplaceMode | ChildSlotMode | null
   *                        ReplaceMode: 替换模式———用新渲染出的元素替换已渲染出的同级元素；
   *                        ChildSlotMode: 如果已有渲染出的元素，则把当前元素作为子元素，否则，直接使用当前元素；
   *                        null: 如果已有渲染出的元素，则使用渲染出的元素，否则创建一个虚拟节点
   */
  abstract render(context: FormatRendingContext, existingElement?: VElement): ReplaceMode | ChildSlotMode | null;

  /**
   * 匹配一个 DOM 节点或抽象格式数据，返回生效状态。
   * @param p
   */
  match(p: HTMLElement | FormatData) {
    if (this.rule.filter) {
      const b = this.rule.filter(p);
      if (!b) {
        return FormatEffect.Invalid;
      }
    }
    const exclude = this.excludeValidators.map(fn => fn(p)).includes(true);
    if (exclude) {
      return FormatEffect.Exclude;
    }
    const inherit = this.inheritValidators.map(fn => fn(p)).includes(true);
    if (inherit) {
      return FormatEffect.Inherit;
    }
    return this.validators.map(fn => fn(p)).includes(true) ? FormatEffect.Valid : FormatEffect.Invalid;
  }

  protected extractData(node: HTMLElement, config: EditableOptions): FormatData {
    if (!config) {
      return new FormatData();
    }
    const attrs = new Map<string, string>();
    if (config.attrs) {
      config.attrs.forEach(key => {
        attrs.set(key, node.getAttribute(key));
      });
    }
    const style: { [key: string]: string | number } = {};
    if (config.styleName) {
      (Array.isArray(config.styleName) ? config.styleName : [config.styleName]).forEach(name => {
        const v = node.style[name];
        if (v) {
          style[name] = v;
        }
      })

    }
    return new FormatData({
      tag: config.tag ? node.nodeName.toLowerCase() : null,
      attrs: attrs.size ? attrs : null,
      styles: style
    });
  }

  private makeTagsMatcher(tags: string[] | RegExp) {
    return (node: HTMLElement | FormatData) => {
      const tagName = node instanceof FormatData ? node.tag : node.nodeName.toLowerCase();
      return Array.isArray(tags) ? tags.includes(tagName) : tags.test(tagName);
    };
  }

  private makeAttrsMatcher(attrs: Array<{ key: string; value?: string | string[] }>) {
    return (node: HTMLElement | FormatData) => {
      return attrs.map(attr => {
        if (attr.value) {
          if (node instanceof FormatData) {
            return node?.attrs.get(attr.key) === attr.value;
          }
          if (node instanceof HTMLElement) {
            return node.getAttribute(attr.key) === attr.value;
          }
        } else {
          if (node instanceof FormatData) {
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
    return (node: HTMLElement | FormatData) => {
      return !Object.keys(styles).map(key => {
        const optionValue = (Array.isArray(styles[key]) ?
          styles[key] :
          [styles[key]]) as Array<string | number | RegExp>;
        let styleValue = node instanceof FormatData ?
          (node.styles.has(key) ? node.styles.get(key) : '') :
          node.style[key];
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
}

/**
 * 行内样式基类，用于扩展行内样式。
 */
export abstract class InlineFormatter extends Formatter {
}


export abstract class BlockFormatter extends Formatter {
  // protected constructor(protected rule: MatchRule = {}, priority: number) {
  //   super(rule, priority);
  // }
}
