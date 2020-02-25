import { Commander, RenderModel, ReplaceModel } from './commander';
import { MatchState } from '../matcher/matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { AttrState } from '../toolbar/formats/forms/help';
import { AbstractData } from '../parser/abstract-data';
import { Single } from '../parser/single';
import { InlineFormat } from '../parser/format';
import { RootFragment } from '../parser/root-fragment';
import { VElement } from '../renderer/element';

export class AttrCommander implements Commander<AttrState[]> {
  recordHistory = true;
  private attrs: AttrState[] = [];

  constructor(private tagName: string) {
  }

  updateValue(value: AttrState[]): void {
    this.attrs = value;
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean, rootFragment: RootFragment): void {
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
        } else {
          range.commonAncestorFragment.getFormatRanges().forEach(format => {
            if (format instanceof InlineFormat) {
              if (format.endIndex >= range.endIndex) {
                format.endIndex++;
              }
              if (format.startIndex > range.startIndex) {
                format.startIndex++;
              }
            }
          });
          const newNode = new Single(
            this.tagName,
            rootFragment.parser.createFormatDeltasByAbstractData(new AbstractData({
              tag: this.tagName,
              attrs
            }))
          );
          range.commonAncestorFragment.insert(newNode, range.startIndex);
          range.startIndex++;
          range.endIndex++;
        }
        return;
      }
      range.getSelectedScope().forEach(item => {
        let index = 0;
        item.context.sliceContents(item.startIndex, item.endIndex)
          .forEach(node => {
            if (node instanceof Single) {
              node.getFormatRangesByHandler(handler).forEach(format => {
                format.abstractData.attrs = attrs;
              });
            }
            index += node.length;
          })
      });
    });
  }

  render(state: MatchState, abstractData: AbstractData, rawElement?: VElement): RenderModel {
    const el = new VElement(this.tagName);
    if (abstractData && abstractData.attrs) {
      abstractData.attrs.forEach((value, key) => {
        if (value !== null) {
          el.attrs.set(key, value);
        }
      })
    }
    return new ReplaceModel(el);
  }
}
