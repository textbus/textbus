import { Fragment } from '../parser/fragment';
import { FormatRange, SingleFormat } from '../parser/format';
import { Single } from '../parser/single';
import { ElementRef, TextRef } from './help';

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
    this.elementRef.destroy();
  }
}

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
    this.elementRef.destroy();
  }
}

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
    this.elementRef.destroy();
  }
}

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
    this.elementRef.destroy();
  }
}

export type Token = TextToken | MediaToken | InlineToken | BlockToken;
