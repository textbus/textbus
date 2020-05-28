import { Lifecycle } from '../core/lifecycle';
import { Renderer } from '../core/renderer';
import { TBSelection } from '../core/selection';
import { Fragment } from '@tanbo/tbus/core/fragment';
import { TBRange } from '@tanbo/tbus/core/range';

export class DefaultHook implements Lifecycle {
  onInput(renderer: Renderer, selection: TBSelection) {
    selection.ranges.forEach(range => {
      const flag = range.startFragment === range.endFragment;
      this.deleteRange(range, flag);
    })
    return true;
  }

  onEnter(renderer: Renderer, selection: TBSelection) {
    if (!selection.collapsed) {
      const b = selection.ranges.map(range => {
        const flag = range.startFragment === range.endFragment;
        this.deleteRange(range, flag);
        return flag;
      }).includes(false);
      if (b) {
        return false;
      }
    }
    return true;
  }

  // onDelete(renderer: Renderer, selection: TBSelection): boolean {
  //
  // }

  private deleteRange(range: TBRange, startFragmentEqualEndFragment: boolean) {
    range.getSelectedScope().forEach(scope => {
      if (scope.startIndex === 0 && scope.endIndex === scope.fragment.contentLength) {
        range.deleteEmptyTree(scope.fragment);
      } else {
        scope.fragment.delete(scope.startIndex, scope.endIndex - scope.startIndex);
      }
    })
    range.startFragment = range.endFragment;
    range.startIndex = range.endIndex = startFragmentEqualEndFragment ? range.startIndex : 0;
  }
}
