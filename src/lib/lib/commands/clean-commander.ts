import { Commander } from './commander';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';
import { Priority } from '../toolbar/help';
import { Fragment } from '../parser/fragment';
import { FormatState } from '../matcher/matcher';
import { FormatRange } from '../parser/format';

export class CleanCommander implements Commander<void> {
  recordHistory = true;

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        this.clean(item.context, item.startIndex, item.endIndex);
      });
    });
  }

  render(): null {
    return null;
  }

  private clean(fragment: Fragment, startIndex: number, endIndex: number) {
    const formatMatrix = fragment.formatMatrix;
    fragment.contents.slice(startIndex, endIndex).forEach(item => {
      if (item instanceof Fragment) {
        this.clean(item, 0, item.contents.length);
      }
    });
    Array.from(formatMatrix.keys()).filter(handler => {
      return ![Priority.Default, Priority.Block, Priority.BlockStyle].includes(handler.priority);
    }).forEach(handler => {
      fragment.apply(new FormatRange({
        state: FormatState.Invalid,
        startIndex,
        endIndex,
        handler: handler,
        context: fragment,
        cacheData: null
      }), false);
    });
  }
}
