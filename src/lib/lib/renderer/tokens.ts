import { Fragment } from '../parser/fragment';
import { FormatRange, SingleFormat } from '../parser/format';
import { Single } from '../parser/single';
import { NativeElement, NativeText } from './renderer';

export class TextToken {
  nativeElement: NativeText;

  get endIndex() {
    return this.startIndex + this.text.length;
  }

  constructor(public context: Fragment,
              public startIndex: number,
              public text: string) {
  }

  destroyView() {
    if (this.nativeElement && this.nativeElement.parentNode) {
      this.nativeElement.parentNode.removeChild(this.nativeElement);
    }
  }
}

export class BlockToken {
  get nativeElement() {
    return this.slotElement;
  }

  slotElement: NativeElement;
  wrapElement: NativeElement;
  readonly children: Array<Token> = [];
  readonly startIndex = 0;

  get endIndex() {
    return this.context.length;
  }

  constructor(public context: Fragment,
              public formats: FormatRange[]) {
  }


  destroyView() {
    if (this.wrapElement && this.wrapElement.parentNode) {
      this.wrapElement.parentNode.removeChild(this.wrapElement);
    }
  }
}

export class InlineToken {
  get nativeElement() {
    return this.slotElement;
  }

  slotElement: NativeElement;
  wrapElement: NativeElement;
  readonly children: Array<Token> = [];

  constructor(public context: Fragment,
              public formats: FormatRange[],
              public startIndex: number,
              public endIndex: number) {
  }

  destroyView() {
    if (this.wrapElement && this.wrapElement.parentNode) {
      this.wrapElement.parentNode.removeChild(this.wrapElement);
    }
  }
}

export class MediaToken {
  nativeElement: NativeElement;

  get endIndex() {
    return this.startIndex + 1;
  }

  constructor(public context: Fragment,
              public data: Single,
              public formats: SingleFormat[],
              public startIndex: number) {
  }

  destroyView() {
    if (this.nativeElement && this.nativeElement.parentNode) {
      this.nativeElement.parentNode.removeChild(this.nativeElement);
    }
  }
}

export type Token = TextToken | MediaToken | InlineToken | BlockToken;
