import { Commander } from './commander';
import { MatchState } from '../matcher/matcher';
import { Fragment } from '../parser/fragment';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';

export class BlockStyleCommander implements Commander {
  constructor(private name: string,
              private value: string | number) {
  }

  command(selection: TBSelection, context: Fragment, handler: Handler, overlap: boolean): void {
  }

  render(state: MatchState): HTMLElement {
    return null;
  }
}
