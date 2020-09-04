import { CommandContext, Commander, FormatAbstractData, FormatEffect } from '../../core/_api';
import { DirFormatter } from '../../formatter/dir.formatter';

export class DirCommander implements Commander<null> {
  recordHistory = true;

  constructor(private formatter: DirFormatter, private dir: 'ltr' | 'rtl') {
  }

  command(context: CommandContext) {
    context.selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        item.fragment.apply(this.formatter, {
          state: context.overlap ? FormatEffect.Invalid : FormatEffect.Valid,
          abstractData: new FormatAbstractData({
            attrs: {
              dir: this.dir
            }
          })
        })
      })
    })
  }
}
