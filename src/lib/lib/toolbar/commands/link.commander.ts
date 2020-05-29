import { Commander } from '../../core/commander';
import { TBSelection } from '../../core/selection';
import { LinkFormatter } from '../../formatter/link.formatter';
import { AttrState } from '../forms/help';
import { Template } from '../../core/template';
import { FormatEffect } from '../../core/formatter';
import { FormatAbstractData } from '../../core/format-abstract-data';

export class LinkCommander implements Commander<AttrState[]> {
  recordHistory = true;

  private attrs: AttrState[];

  constructor(private formatter: LinkFormatter) {
  }

  updateValue(value: AttrState[]) {
    this.attrs = value;
  }

  command(selection: TBSelection, overlap: boolean): void {
    const attrs = new Map<string, string>();
    this.attrs.forEach(attr => {
      attrs.set(attr.name, attr.value.toString());
    });
    selection.ranges.forEach(range => {
      if (range.collapsed) {
        if (overlap) {
          const formats = range.commonAncestorFragment.getFormatRangesByFormatter(this.formatter);
          if (formats) {
            for (const format of formats) {
              if (range.startIndex > format.startIndex && range.endIndex <= format.endIndex) {
                format.abstractData.attrs = attrs
              }
            }
          }
        }
      }
      range.getSelectedScope().forEach(scope => {
        let index = 0;
        scope.fragment.sliceContents(scope.startIndex, scope.endIndex).forEach(content => {
          if (content instanceof Template) {
            content.childSlots.forEach(item => {
              item.apply({
                startIndex: 0,
                endIndex: item.contentLength,
                state: FormatEffect.Valid,
                renderer: this.formatter,
                abstractData: new FormatAbstractData({
                  attrs
                })
              })
            })
          } else {
            scope.fragment.apply({
              startIndex: scope.startIndex + index,
              endIndex: scope.startIndex + index + content.length,
              state: FormatEffect.Valid,
              renderer: this.formatter,
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
