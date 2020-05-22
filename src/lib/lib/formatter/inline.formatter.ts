import { Formatter, MatchRule, FormatEffect } from '../core/formatter';
import { FormatAbstractData } from '../core/format-abstract-data';
import { VElement } from '../core/element';
import { ChildSlotModel } from '../core/renderer';

export class InlineFormatter extends Formatter {
  constructor(private tagName: string, rule: MatchRule) {
    super(rule);
  }

  read(node: HTMLElement): FormatAbstractData {
    return new FormatAbstractData({
      tag: this.tagName
    });
  }

  render(state: FormatEffect, abstractData: FormatAbstractData, existingElement?: VElement) {
    return new ChildSlotModel(new VElement(this.tagName));
  }
}

export const italicFormatter = new InlineFormatter('em', {
  tags: ['em', 'i'],
  styles: {
    fontStyle: ['italic']
  },
  excludeStyles: {
    fontStyle: /(?!italic).+/
  }
});
export const strikeThroughFormatter = new InlineFormatter('del', {
  tags: ['strike', 'del', 's'],
  styles: {
    textDecoration: ['line-through']
  }
});
export const underlineFormatter = new InlineFormatter('u', {
  tags: ['u'],
  styles: {
    textDecoration: ['underline']
  }
});
export const subscriptFormatter = new InlineFormatter('sub', {
  tags: ['sub']
});
export const superscriptFormatter = new InlineFormatter('sup', {
  tags: ['sup']
});
