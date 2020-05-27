import { Lifecycle } from '../core/lifecycle';
import { Renderer } from '../core/renderer';
import { TBSelection } from '../core/selection';
import { Fragment } from '@tanbo/tbus/core/fragment';
import { TBRange } from '@tanbo/tbus/core/range';

export class DefaultHook implements Lifecycle {
  onInput(renderer: Renderer, selection: TBSelection) {
    selection.ranges.forEach(range => {
      const flag = range.startFragment === range.endFragment;
      this.deleteRange(range, renderer, flag);
    })
    return true;
  }

  onEnter(renderer: Renderer, selection: TBSelection) {
    if (!selection.collapsed) {
      const b = selection.ranges.map(range => {
        const flag = range.startFragment === range.endFragment;
        this.deleteRange(range, renderer, flag);
        return flag;
      }).includes(false);
      if (b) {
        return false;
      }
    }
    return true;
  }

  private deleteRange(range: TBRange, renderer: Renderer, startFragmentEqualEndFragment: boolean) {
    range.getSelectedScope().forEach(scope => {
      if (scope.startIndex === 0 && scope.endIndex === scope.fragment.contentLength) {
        this.deleteEmptyTree(scope.fragment, renderer);
      } else {
        scope.fragment.delete(scope.startIndex, scope.endIndex - scope.startIndex);
      }
    })
    range.startFragment = range.endFragment;
    range.startIndex = range.endIndex = startFragmentEqualEndFragment ? range.startIndex : 0;
  }

  private deleteEmptyTree(fragment: Fragment, renderer: Renderer) {
    const parentTemplate = renderer.getParentTemplateByFragment(fragment);
    parentTemplate.childSlots.splice(parentTemplate.childSlots.indexOf(fragment), 1);
    if (parentTemplate.childSlots.length === 0) {
      const parentFragment = renderer.getParentFragmentByTemplate(parentTemplate);
      const index = parentFragment.find(parentTemplate);
      parentFragment.delete(index, 1);
      if (parentFragment.contentLength === 0) {
        this.deleteEmptyTree(parentFragment, renderer);
      }
    }
  }
}
