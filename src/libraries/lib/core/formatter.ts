import { AbstractData } from './abstract-data';

export interface EditableOptions {
  /** 设置是否要编辑标签 */
  tag?: boolean;
  /** 设置要编辑的 HTML 属性 */
  attrs?: string[];
  /** 设置要编辑的 Style */
  styleName?: string;
}

export abstract class Formatter {
  abstract get editableOptions(): EditableOptions;
  abstract is(node: HTMLElement): boolean;
  abstract renderer(data: AbstractData): any;

  extractData(node: HTMLElement): AbstractData {
    const config = this.editableOptions;
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
}

export class FormatRange {
  constructor(public abstractData: AbstractData,
              public renderer: any) {
  }
}

export class InlineFormatRange extends FormatRange {
  constructor(public abstractData: AbstractData,
              public renderer: any,
              public startIndex: number,
              public endIndex: number) {
    super(abstractData, renderer);
  }
}
