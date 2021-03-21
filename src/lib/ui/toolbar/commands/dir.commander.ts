import { FormatData, FormatEffect } from '../../../core/_api';
import { CommandContext, Commander } from '../commander';
import { DirFormatter } from '../../../formatter/dir.formatter';

export class DirCommander implements Commander<null> {
  recordHistory = true;

  constructor(private formatter: DirFormatter, private dir: 'ltr' | 'rtl') {
  }

  command(context: CommandContext) {
    context.selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        item.fragment.apply(this.formatter, {
          effect: context.overlap ? FormatEffect.Invalid : FormatEffect.Valid,
          formatData: new FormatData({
            attrs: {
              dir: this.dir
            }
          })
        })
      })
    })
  }
}
