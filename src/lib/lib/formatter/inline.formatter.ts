import { InlineFormatter, MatchRule, FormatEffect } from '../core/formatter';
import { FormatAbstractData } from '../core/format-abstract-data';
import { VElement } from '../core/element';
import { ChildSlotModel } from '../core/renderer';

export class InlineTagFormatter extends InlineFormatter {
  constructor(private tagName: string, rule: MatchRule) {
    super(rule, 0);
  }

  read(node: HTMLElement): FormatAbstractData {
    return new FormatAbstractData({
      tag: this.tagName
    });
  }

  render(isProduction: boolean, state: FormatEffect, abstractData: FormatAbstractData, existingElement?: VElement) {
    return new ChildSlotModel(new VElement(this.tagName));
  }
}

export const italicFormatter = new InlineTagFormatter('em', {
  tags: ['em', 'i'],
  styles: {
    fontStyle: ['italic']
  },
  excludeStyles: {
    fontStyle: /(?!italic).+/
  }
});
export const strikeThroughFormatter = new InlineTagFormatter('del', {
  tags: ['strike', 'del', 's'],
  styles: {
    textDecoration: ['line-through']
  }
});
export const underlineFormatter = new InlineTagFormatter('u', {
  tags: ['u'],
  styles: {
    textDecoration: ['underline']
  }
});
export const subscriptFormatter = new InlineTagFormatter('sub', {
  tags: ['sub']
});
export const superscriptFormatter = new InlineTagFormatter('sup', {
  tags: ['sup']
});
