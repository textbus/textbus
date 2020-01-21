import { Fragment } from '../parser/fragment';
import { FormatRange, SingleFormat } from '../parser/format';
import { Single } from '../parser/single';
import { ElementRef, TextRef } from './renderer';

/**
 * 文本 Token
 * 主要用于储存一段文本的内容和位置信息
 */
export class TextToken {
  elementRef: TextRef;

  get endIndex() {
    return this.startIndex + this.text.length;
  }

  constructor(public context: Fragment,
              public startIndex: number,
              public text: string) {
  }

  destroyView() {
    if (this.elementRef) {
      this.elementRef.destroy();
    }
  }
}

/**
 * Block Token
 * 主要用于储存 Block 元素节点的格式化信息和节点树
 */
export class BlockToken {
  get elementRef() {
    return this.slotElement;
  }

  slotElement: ElementRef;
  wrapElement: ElementRef;
  readonly children: Array<Token> = [];
  readonly startIndex = 0;

  get endIndex() {
    return this.context.length;
  }

  constructor(public context: Fragment,
              public formats: FormatRange[]) {
  }


  destroyView() {
    if (this.wrapElement) {
      this.wrapElement.destroy();
    }
  }
}

/**
 * Inline Token
 * 主要用于储存 Inline 元素节点的格式化信息和节点树
 */
export class InlineToken {
  get elementRef() {
    return this.slotElement;
  }

  slotElement: ElementRef;
  wrapElement: ElementRef;
  readonly children: Array<Token> = [];

  constructor(public context: Fragment,
              public formats: FormatRange[],
              public startIndex: number,
              public endIndex: number) {
  }

  destroyView() {
    if (this.wrapElement) {
      this.wrapElement.destroy();
    }
  }
}
/**
 * Media Token
 * 主要用于储存单元素节点的格式化信息和节点树，如 br、img等
 */
export class MediaToken {
  elementRef: ElementRef;

  get endIndex() {
    return this.startIndex + 1;
  }

  constructor(public context: Fragment,
              public data: Single,
              public formats: SingleFormat[],
              public startIndex: number) {
  }

  destroyView() {
    if (this.elementRef) {
      this.elementRef.destroy();
    }
  }
}

export type Token = TextToken | MediaToken | InlineToken | BlockToken;
