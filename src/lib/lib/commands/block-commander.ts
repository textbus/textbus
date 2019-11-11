import { Commander } from './commander';
import { MatchState } from '../matcher/matcher';
import { Fragment } from '../parser/fragment';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';

export class BlockCommander implements Commander {
  constructor(private tagName: string) {
  }

  command(selection: TBSelection, context: Fragment, handler: Handler, overlap: boolean): void {
  }

  render(state: MatchState): HTMLElement {
    return document.createElement(this.tagName);
  }
}
