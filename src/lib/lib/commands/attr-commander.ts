import { Commander, ReplaceModel } from './commander';
import { FormatState } from '../matcher/matcher';
import { Fragment } from '../parser/fragment';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';
import { Observable } from 'rxjs';
import { AttrState } from '../toolbar/formats/forms/help';

export class AttrCommander implements Commander {
  constructor(private tagName: string,
              attrs: AttrState[] | Observable<AttrState[]>,
              private containsChild = false) {
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
  }

  render(state: FormatState, rawElement?: HTMLElement): ReplaceModel {
    return new ReplaceModel(document.createElement(this.tagName));
  }
}
