import { Commander, TBSelection, FormatEffect, FormatAbstractData } from '../../core/_api';
import { DirFormatter } from '../../formatter/dir.formatter';

export class DirCommander implements Commander {
  recordHistory = true;

  constructor(private formatter: DirFormatter, private dir: 'ltr' | 'rtl') {
  }

  command(selection: TBSelection, overlap: boolean) {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        item.fragment.apply({
          state: FormatEffect.Valid,
          renderer: this.formatter,
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
