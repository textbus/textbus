import { Commander, ReplaceModel } from './commander';
import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { Fragment } from '../parser/fragment';
import { unwrap, wrap } from './utils';

export class ToggleBlockCommander implements Commander {
  recordHistory = true;

  constructor(private tagName: string) {
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): Fragment {
    if (overlap) {
      return unwrap(selection, handler);
    } else {
      unwrap(selection, handler);
      return wrap(selection, handler, this.tagName);
    }
  }

  render(state: FormatState, rawElement?: HTMLElement): ReplaceModel {
    if (state === FormatState.Valid) {
      return new ReplaceModel(document.createElement(this.tagName));
    }
    return null;
  }
}
