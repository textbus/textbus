import { Commander, TBSelection, InlineFormatter, FormatEffect, FormatAbstractData } from '../../core/_api';
import { BlockTemplate } from '../../templates/block.template';

export class BoldCommander implements Commander<InlineFormatter> {
  recordHistory = true;

  constructor(private formatter: InlineFormatter) {
  }

  command(selection: TBSelection, overlap: boolean): void {
    selection.ranges.forEach(range => {
      const hasContext = range.commonAncestorTemplate instanceof BlockTemplate &&
        /h[1-6]/i.test(range.commonAncestorTemplate.tagName);
      const state = hasContext ?
        (overlap ? FormatEffect.Exclude : FormatEffect.Inherit) :
        (overlap ? FormatEffect.Invalid : FormatEffect.Valid)
      range.getSelectedScope().forEach(item => {
        item.fragment.apply({
          state,
          startIndex: item.startIndex,
          endIndex: item.endIndex,
          renderer: this.formatter,
          abstractData: new FormatAbstractData({
            tag: 'strong'
          })
        });
      });
    });
  }
}
