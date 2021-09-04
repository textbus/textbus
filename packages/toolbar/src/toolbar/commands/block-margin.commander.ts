import {
  BackboneAbstractComponent,
  BranchAbstractComponent,
  DivisionAbstractComponent,
  FormatData,
  FormatEffect,
  Fragment
} from '@textbus/core';
import { BlockMarginFormatter } from '@textbus/formatters';

import { CommandContext, Commander } from '../commander';

export class BlockMarginCommander implements Commander<Map<string, string>> {
  recordHistory = true;

  constructor(private formatter: BlockMarginFormatter) {
  }

  command(context: CommandContext, params: Map<string, string>) {
    const effect = Array.from(params.values()).filter(i => i).length ? FormatEffect.Valid : FormatEffect.Invalid;
    const styles = {
      marginTop: params.get('marginTop'),
      marginRight: params.get('marginRight'),
      marginBottom: params.get('marginBottom'),
      marginLeft: params.get('marginLeft'),
    };

    context.selection.ranges.forEach(range => {
      const commonAncestorFragment = range.commonAncestorFragment;
      if (commonAncestorFragment === range.startFragment && commonAncestorFragment === range.endFragment) {
        this.apply(commonAncestorFragment, effect, styles);
      } else {
        range.getSelectedScope().forEach(scope => {
          if (scope.fragment !== commonAncestorFragment) {
            this.apply(scope.fragment, effect, styles);
          } else {
            commonAncestorFragment.sliceContents(scope.startIndex, scope.endIndex).forEach(content => {
              if (content instanceof DivisionAbstractComponent) {
                this.apply(content.slot, effect, styles)
              } else if (content instanceof BranchAbstractComponent) {
                content.slots.forEach(slot => {
                  this.apply(slot, effect, styles)
                })
              } else if (content instanceof BackboneAbstractComponent) {
                for (const slot of content) {
                  this.apply(slot, effect, styles);
                }
              }
            })
          }
        })
      }
    })
  }

  private apply(fragment: Fragment, effect: FormatEffect, styles: { [key: string]: string }) {
    fragment.apply(this.formatter, {
      effect,
      startIndex: 0,
      endIndex: fragment.length,
      formatData: new FormatData({
        styles
      })
    })
  }
}
