import { Commander } from './commander';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';
import { AttrState } from '../toolbar/formats/forms/help';
import { Priority } from '../toolbar/help';
import { FormatRange } from '../parser/fragment';
import { FormatState } from '../matcher/matcher';

export class CleanCommander implements Commander<AttrState[]> {
  recordHistory = true;

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        const formatMatrix = item.context.formatMatrix;
        Array.from(formatMatrix.keys()).filter(handler => {
          return ![Priority.Default, Priority.Block, Priority.BlockStyle].includes(handler.priority);
        }).forEach(handler => {
          item.context.apply(new FormatRange({
            state: FormatState.Invalid,
            startIndex: item.startIndex,
            endIndex: item.endIndex,
            handler: handler,
            context: item.context,
            cacheData: null
          }), false);
        });
      });
    });
  }

  render(): null {
    return null;
  }
}
