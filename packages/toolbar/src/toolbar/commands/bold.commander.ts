import {
  InlineFormatter,
  FormatEffect,
  FormatData
} from '@textbus/core';
import { BlockComponent } from '@textbus/components';

import { CommandContext, Commander } from '../commander';

export class BoldCommander implements Commander<null> {
  recordHistory = true;

  constructor(private formatter: InlineFormatter) {
  }

  command(context: CommandContext): void {
    this.recordHistory = !context.selection.collapsed;
    if (!this.recordHistory) {
      return;
    }
    context.selection.ranges.forEach(range => {
      const componentContext = range.commonAncestorFragment.getContext(BlockComponent);
      const hasContext = componentContext && /h[1-6]/i.test(componentContext.tagName);
      const state = hasContext ?
        (context.overlap ? FormatEffect.Exclude : FormatEffect.Inherit) :
        (context.overlap ? FormatEffect.Invalid : FormatEffect.Valid)
      range.getSelectedScope().forEach(item => {
        item.fragment.apply(this.formatter, {
          effect: state,
          startIndex: item.startIndex,
          endIndex: item.endIndex,
          formatData: new FormatData({
            tag: 'strong'
          })
        });
      });
    });
  }
}
