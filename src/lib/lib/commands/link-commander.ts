import { ChildSlotModel, Commander } from './commander';
import { MatchState } from '../matcher/matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { AttrState } from '../toolbar/formats/forms/help';
import { AbstractData } from '../parser/abstract-data';
import { Single } from '../parser/single';
import { InlineFormat } from '../parser/format';
import { VElement } from '../renderer/element';

export class LinkCommander implements Commander<AttrState[]> {
  recordHistory = true;
  private attrs: AttrState[] = [];
  private tagName = 'a';

  updateValue(value: AttrState[]): void {
    this.attrs = value;
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
    const attrs = new Map<string, string>();
    this.attrs.forEach(attr => {
      attrs.set(attr.name, attr.value.toString());
    });
    selection.ranges.forEach(range => {
      if (range.collapsed) {
        if (overlap) {
          const formats = range.commonAncestorFragment.getFormatRangesByHandler(handler);
          if (formats) {
            for (const format of formats) {
              if (range.startIndex > format.startIndex && range.endIndex <= format.endIndex) {
                format.abstractData.attrs = attrs
              }
            }
          }
        }
      }
      range.getSelectedScope().forEach(item => {
        let index = 0;
        item.context.sliceContents(item.startIndex, item.endIndex)
          .forEach(node => {
            if (node instanceof Single) {
              node.getFormatRangesByHandler(handler).forEach(format => {
                format.abstractData.attrs = attrs;
              });
            } else if (typeof node === 'string') {
              item.context.apply(new InlineFormat({
                startIndex: item.startIndex + index,
                endIndex: item.endIndex + index,
                handler,
                state: MatchState.Valid,
                context: item.context,
                abstractData: new AbstractData({
                  attrs
                })
              }), false);
            }
            index += node.length;
          })
      });
    });
  }

  render(state: MatchState, rawElement?: VElement, abstractData?: AbstractData): ChildSlotModel {
    const el = new VElement(this.tagName);
    if (abstractData && abstractData.attrs) {
      abstractData.attrs.forEach((value, key) => {
        el.attrs.set(key, value + '');
      })
    }
    return new ChildSlotModel(el);
  }
}
