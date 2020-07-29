import { Commander, FormatAbstractData, FormatEffect, TBSelection } from '../../core/_api';
import { DirFormatter } from '../../formatter/dir.formatter';

export class DirCommander implements Commander<null> {
  recordHistory = true;

  constructor(private formatter: DirFormatter, private dir: 'ltr' | 'rtl') {
  }

  command(selection: TBSelection, _: null, overlap: boolean) {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        item.fragment.apply(this.formatter, {
          state: overlap ? FormatEffect.Invalid : FormatEffect.Valid,
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
