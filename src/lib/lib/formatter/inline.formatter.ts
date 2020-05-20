import { Formatter, MatchRule, MatchState } from '../core/formatter';
import { AbstractData } from '../core/abstract-data';
import { VElement } from '../core/element';
import { ChildSlotModel } from '../core/renderer';

export class InlineFormatter extends Formatter {
  constructor(private tagName: string, rule: MatchRule) {
    super(rule);
  }

  read(node: HTMLElement): AbstractData {
    return new AbstractData({
      tag: this.tagName
    });
  }

  render(state: MatchState, abstractData: AbstractData, existingElement?: VElement) {
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
