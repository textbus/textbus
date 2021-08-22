import {
  BranchAbstractComponent, DivisionAbstractComponent,
  FormatData,
  FormatEffect, Fragment,
  BackboneAbstractComponent
} from '@textbus/core';
import { BlockStyleFormatter } from '@textbus/formatters';

import { CommandContext, Commander } from '../commander';

export class BlockStyleCommander implements Commander<string> {
  recordHistory = true;

  constructor(private name: string, private formatter: BlockStyleFormatter) {
  }

  command(context: CommandContext, value: string) {
    context.selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        const fragments: Fragment[] = [];
        if (item.fragment === range.startFragment || item.fragment === range.endFragment) {
          fragments.push(item.fragment);
        } else {
          if (item.startIndex === 0 && item.endIndex === item.fragment.length) {
            fragments.push(item.fragment);
          } else {
            const ff: Fragment[] = [];
            let flag = false;
            item.fragment.sliceContents(item.startIndex, item.endIndex).forEach(content => {
              if (content instanceof DivisionAbstractComponent) {
                fragments.push(content.slot);
              } else if (content instanceof BranchAbstractComponent) {
                fragments.push(...content.slots);
              } else if (content instanceof BackboneAbstractComponent) {
                fragments.push(...Array.from(content));
              } else {
                flag = true;
              }
            })
            if (flag) {
              fragments.push(item.fragment);
            } else {
              fragments.push(...ff);
            }
          }
        }
        fragments.forEach(slot => {
          slot.apply(this.formatter, {
            effect: value ? FormatEffect.Valid : FormatEffect.Invalid,
            formatData: new FormatData({
              styles: {
                [this.name]: value
              }
            })
          });
        })
      });
    });
  }
}
