import { BranchComponent, Commander, FormatAbstractData, FormatEffect, TBSelection } from '../../core/_api';
import { LinkFormatter } from '../../formatter/link.formatter';
import { AttrState } from '../forms/help';

export class LinkCommander implements Commander<AttrState[]> {
  recordHistory = true;

  private attrs: AttrState[];

  constructor(private formatter: LinkFormatter) {
  }

  updateValue(value: AttrState[]) {
    this.attrs = value;
  }

  command(selection: TBSelection, overlap: boolean): void {
    this.recordHistory = !selection.collapsed;
    if (!this.recordHistory) {
      return;
    }
    const attrs = new Map<string, string>();
    this.attrs.forEach(attr => {
      attrs.set(attr.name, attr.value.toString());
    });
    selection.ranges.forEach(range => {
      if (range.collapsed) {
        if (overlap) {
          const commonAncestorFragment = range.commonAncestorFragment;
          commonAncestorFragment.getFormatKeys().forEach(token => {
            commonAncestorFragment.getFormatRanges(token).forEach(format => {
              if (range.startIndex > format.startIndex && range.endIndex <= format.endIndex) {
                if (attrs.get('href')) {
                  format.abstractData.attrs = attrs
                } else {
                  commonAncestorFragment.apply(token, {
                    ...format,
                    state: FormatEffect.Invalid
                  });
                }
              }
            });
          })
        }
      }
      range.getSelectedScope().forEach(scope => {
        let index = 0;
        scope.fragment.sliceContents(scope.startIndex, scope.endIndex).forEach(content => {
          if (content instanceof BranchComponent) {
            content.slots.forEach(item => {
              item.apply(this.formatter, {
                startIndex: 0,
                endIndex: item.contentLength,
                state: FormatEffect.Valid,
                abstractData: new FormatAbstractData({
                  attrs
                })
              })
            })
          } else {
            scope.fragment.apply(this.formatter, {
              startIndex: scope.startIndex + index,
              endIndex: scope.startIndex + index + content.length,
              state: FormatEffect.Valid,
              abstractData: new FormatAbstractData({
                attrs
              })
            })
          }
          index += content.length;
        })
      });
    })
  }
}
