import { Commander } from './commander';
import { MatchState } from '../matcher/matcher';
import { Fragment } from '../parser/fragment';

export class Inline implements Commander {
  constructor(private tagName: string) {
  }

  command(state: MatchState, context: Fragment): Element {
    return state === MatchState.Matched ? document.createElement(this.tagName) : document.createElement('span');
  }
}
