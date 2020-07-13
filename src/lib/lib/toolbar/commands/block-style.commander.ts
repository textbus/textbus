import {
  BackboneComponent, BranchComponent,
  Commander,
  FormatAbstractData,
  FormatEffect, Fragment,
  TBSelection
} from '../../core/_api';
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
        let fragments: Fragment[] = [];
        if (item.fragment === range.startFragment || item.fragment === range.endFragment) {
          fragments = [item.fragment];
        } else {
          item.fragment.sliceContents(item.startIndex, item.endIndex).forEach(content => {
            if (content instanceof BackboneComponent) {
              fragments = content.slots;
            } else if (content instanceof BranchComponent) {
              fragments = [content.slot];
            }
          })
        }
        fragments.forEach(slot => {
          slot.apply({
            state: this.value ? FormatEffect.Valid : FormatEffect.Invalid,
            renderer: this.formatter,
            abstractData: new FormatAbstractData({
              style: {
                name: this.name,
                value: this.value
              }
            })
          });
        })
      });
    });
  }
}
