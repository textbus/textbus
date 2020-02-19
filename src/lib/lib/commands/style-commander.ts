import { ChildSlotModel, Commander, RenderModel } from './commander';
import { MatchState } from '../matcher/matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { InlineFormat } from '../parser/format';
import { AbstractData } from '../parser/abstract-data';
import { dtd } from '../parser/dtd';
import { VElement } from '../renderer/element';

export class StyleCommander implements Commander<string | number> {
  recordHistory = true;
  private value: string | number;

  constructor(private name: string, private canApplyBlockFragment = true) {
  }

  updateValue(value: string | number) {
    this.value = value;
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        const r = new InlineFormat({
          startIndex: item.startIndex,
          endIndex: item.endIndex,
          handler,
          context: item.context,
          state: MatchState.Valid,
          abstractData: {
            style: {name: this.name, value: this.value}
          }
        });
        item.context.apply(r, false);
      });
    });
  }

  render(state: MatchState, abstractData: AbstractData, rawElement?: VElement): RenderModel {
    if (abstractData && abstractData.style) {
      if (rawElement) {
        const isInline = dtd[rawElement.tagName.toLowerCase()].display === 'inline';
        if (this.canApplyBlockFragment || isInline) {
          rawElement.styles.set(abstractData.style.name, abstractData.style.value);
          return null;
        }
      }
      const el = new VElement('span');
      el.styles.set(abstractData.style.name, abstractData.style.value);
      return new ChildSlotModel(el);
    }
    return null;
  }
}
