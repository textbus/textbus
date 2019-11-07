import { Commander } from './commander';
import { MatchState } from '../matcher/matcher';
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

  command(selection: TBSelection, context: Fragment, handler: Handler, overlap: boolean): void {
  }

  render(state: MatchState): HTMLElement {
    return null;
  }
}
