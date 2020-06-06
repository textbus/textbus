import { Commander, TBSelection, FormatEffect, FormatAbstractData } from '../../core/_api';

export class ToggleBlockCommander implements Commander<string> {
  recordHistory = true;

  constructor(private tagName: string) {
  }

  command(selection: TBSelection, overlap: boolean) {
    // selection.ranges.forEach(range => {
    //   range.getSelectedScope().forEach(item => {
    //     item.fragment.apply({
    //       state: overlap ? FormatEffect.Invalid : FormatEffect.Valid,
    //       startIndex: item.startIndex,
    //       endIndex: item.endIndex,
    //       renderer: this.formatter,
    //       abstractData: new FormatAbstractData({
    //         tag: this.tagName
    //       })
    //     });
    //   });
    // });
  }
}
