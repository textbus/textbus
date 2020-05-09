import { AbstractData } from './abstract-data';
import { VElement } from './element';

export interface EditableOptions {
  /** 设置是否要编辑标签 */
  tag?: boolean;
  /** 设置要编辑的 HTML 属性 */
  attrs?: string[];
  /** 设置要编辑的 Style */
  styleName?: string;
}

export interface Formatter {
  is(node: HTMLElement): boolean;

  read(node: HTMLElement): AbstractData;

  render(abstractData: AbstractData): VElement;
}

export function extractData(node: HTMLElement, config: EditableOptions): AbstractData {
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

export interface FormatRange {
  startIndex: number;
  endIndex: number;
  abstractData: AbstractData;
  renderer: Formatter;
}
