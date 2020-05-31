import { Commander, TBSelection, FormatEffect, FormatAbstractData } from '../../core/_api';
import { BlockStyleFormatter } from '../../formatter/block-style.formatter';

export class BlockStyleCommander implements Commander<string> {
  recordHistory = true;

  private value = '';

  constructor(private name: string, private formatter: BlockStyleFormatter) {
  }

  updateValue(value: string) {
    this.value = value;
  }

  command(selection: TBSelection, overlap: boolean) {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        item.fragment.apply({
          state: FormatEffect.Valid,
          renderer: this.formatter,
          abstractData: new FormatAbstractData({
            style: {
              name: this.name,
              value: this.value
            }
          })
        });
      });
    });
  }
}
