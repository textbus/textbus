import { Lifecycle } from '../core/lifecycle';
import { Renderer } from '../core/renderer';
import { TBSelection } from '../core/selection';
import { Fragment } from '@tanbo/tbus/core/fragment';

export class DefaultHook implements Lifecycle {
  onEnter(renderer: Renderer, selection: TBSelection) {
    const deleteEmptyTree = (fragment: Fragment) => {
      const parentTemplate = renderer.getParentTemplateByFragment(fragment);
      parentTemplate.childSlots.splice(parentTemplate.childSlots.indexOf(fragment), 1);
      if (parentTemplate.childSlots.length === 0) {
        const parentFragment = renderer.getParentFragmentByTemplate(parentTemplate);
        const index = parentFragment.find(parentTemplate);
        parentFragment.delete(index, 1);
        if (parentFragment.contentLength === 0) {
          deleteEmptyTree(parentFragment);
        }
      }
    }
    if (!selection.collapsed) {
      const b = selection.ranges.map(range => {
        const flag = range.startFragment === range.endFragment;
        range.getSelectedScope().forEach(scope => {
          if (scope.startIndex === 0 && scope.endIndex === scope.fragment.contentLength) {
            deleteEmptyTree(scope.fragment);
          } else {
            scope.fragment.delete(scope.startIndex, scope.endIndex - scope.startIndex);
          }
        })
        range.startFragment = range.endFragment;
        range.startIndex = range.endIndex = flag ? range.startIndex : 0;
        return flag;
      }).includes(false);
      if (b) {
        return false;
      }
    }
    return true;
  }
}
