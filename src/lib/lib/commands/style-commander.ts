import { Observable } from 'rxjs';

import { ChildSlotModel, UpdateCommander } from './commander';
import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';
import { FormatRange } from '../parser/fragment';

export class StyleCommander implements UpdateCommander {
  private value: string | number;

  constructor(private name: string,
              value: string | number | Observable<string | number>) {
    if (value instanceof Observable) {
      value.subscribe(v => this.value = v);
    } else {
      this.value = value;
    }
  }

  updateValue(value: string | number) {
    this.value = value;
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        const r = new FormatRange(
          item.startIndex,
          item.endIndex,
          FormatState.Valid,
          handler,
          item.context
        );
        item.context.apply(r, false);
      });
    });
  }

  render(state: FormatState, rawElement?: HTMLElement): ChildSlotModel {
    if (rawElement) {
      rawElement.style[this.name] = this.value;
      return null;
    }
    const el = document.createElement('span');
    el.style[this.name] = this.value;
    return new ChildSlotModel(el);
  }
}
