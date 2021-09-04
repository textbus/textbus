import {
  FormatData,
  FormatEffect,
  Fragment,
  DivisionAbstractComponent,
  BranchAbstractComponent, BackboneAbstractComponent
} from '@textbus/core';
import { BlockComponent } from '@textbus/components';
import { boldFormatter } from '@textbus/formatters';

import { CommandContext, Commander } from '../commander';

export class BlockCommander implements Commander<string> {
  recordHistory = true;

  private tagName: string;

  command(context: CommandContext, tagName: string): void {
    this.tagName = tagName;
    context.selection.ranges.forEach(range => {

      range.getSuccessiveContents().forEach(scope => {
        const blockComponent = new BlockComponent(tagName);

        const parentComponent = scope.fragment.parentComponent;

        if (scope.startIndex === 0 && scope.endIndex === scope.fragment.length) {
          if (scope.fragment === range.startFragment) {
            range.startFragment = blockComponent.slot;
          }
          if (scope.fragment === range.endFragment) {
            range.endFragment = blockComponent.slot;
          }
          if (parentComponent instanceof DivisionAbstractComponent) {
            const parentFragment = parentComponent.parentFragment;
            blockComponent.slot.from(scope.fragment);
            parentFragment.insertBefore(blockComponent, parentComponent);
            const index = parentFragment.indexOf(parentComponent);
            parentFragment.cut(index, index + 1);
            this.effect(blockComponent.slot, parentComponent.tagName);
          } else if (parentComponent instanceof BranchAbstractComponent) {
            const index = parentComponent.slots.indexOf(scope.fragment);
            blockComponent.slot.from(scope.fragment);
            this.effect(blockComponent.slot, parentComponent.tagName);
            const fragment = new Fragment();
            fragment.append(blockComponent);
            parentComponent.slots.splice(index, 1, fragment);
          } else if (parentComponent instanceof BackboneAbstractComponent) {
            blockComponent.slot.from(scope.fragment);
            scope.fragment.append(blockComponent);
            this.effect(blockComponent.slot, parentComponent.tagName);
          }
        } else {
          const c = scope.fragment.cut(scope.startIndex, scope.endIndex);
          blockComponent.slot.from(c);
          if (scope.fragment === range.startFragment) {
            range.setStart(blockComponent.slot, range.startIndex - scope.startIndex);
          }
          if (scope.fragment === range.endFragment) {
            range.setEnd(blockComponent.slot, range.endIndex - scope.startIndex);
          }
          scope.fragment.insert(blockComponent, scope.startIndex);
          this.effect(blockComponent.slot, '');
        }
      })
    })
  }

  private effect(fragment: Fragment, oldTagName: string) {
    if (/h[1-6]/.test(this.tagName)) {
      fragment.apply(boldFormatter, {
        effect: FormatEffect.Inherit,
        startIndex: 0,
        endIndex: fragment.length,
        formatData: new FormatData({
          tag: 'strong'
        })
      })
    } else if (this.tagName === 'p') {
      const flag = /h[1-6]/.test(oldTagName);
      if (flag) {
        fragment.apply(boldFormatter, {
          effect: FormatEffect.Invalid,
          startIndex: 0,
          endIndex: fragment.length,
          formatData: new FormatData({
            tag: 'strong'
          })
        })
      }
    }
  }
}
