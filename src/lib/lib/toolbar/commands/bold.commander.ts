import { Commander, TBSelection, InlineFormatter, FormatEffect, FormatAbstractData, Renderer } from '../../core/_api';
import { BlockComponent } from '../../components/block.component';

export class BoldCommander implements Commander<InlineFormatter> {
  recordHistory = true;

  constructor(private formatter: InlineFormatter) {
  }

  command(selection: TBSelection, overlap: boolean, renderer: Renderer): void {
    this.recordHistory = !selection.collapsed;
    if (!this.recordHistory) {
      return;
    }
    selection.ranges.forEach(range => {
      const context = renderer.getContext(range.commonAncestorFragment, BlockComponent);
      const hasContext = context && /h[1-6]/i.test(context.tagName);
      const state = hasContext ?
        (overlap ? FormatEffect.Exclude : FormatEffect.Inherit) :
        (overlap ? FormatEffect.Invalid : FormatEffect.Valid)
      range.getSelectedScope().forEach(item => {
        item.fragment.apply(this.formatter, {
          state,
          startIndex: item.startIndex,
          endIndex: item.endIndex,
          abstractData: new FormatAbstractData({
            tag: 'strong'
          })
        });
      });
    });
  }
}
