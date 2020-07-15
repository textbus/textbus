import {
  Commander,
  TBSelection,
  Renderer,
  Fragment,
  BranchComponent,
  DivisionComponent,
  TBRangeScope, BackboneComponent
} from '../../core/_api';
import { ListComponent, BlockComponent } from '../../components/_api';

export class ListCommander implements Commander {
  recordHistory = true;

  constructor(private tagName: 'ol' | 'ul') {
  }

  command(selection: TBSelection, overlap: boolean, renderer: Renderer): void {
    selection.ranges.forEach(range => {
      if (overlap) {
        range.getSlotRange(ListComponent, instance => instance.tagName === this.tagName).forEach(item => {
          const slots = item.component.split(item.startIndex, item.endIndex);
          const parentFragment = renderer.getParentFragment(item.component);
          if (slots.before.length) {
            const beforeList = new ListComponent(this.tagName);
            beforeList.slots.push(...slots.before);
            parentFragment.insertBefore(beforeList, item.component);
          }
          if (slots.center.length) {
            slots.center.forEach(fragment => {
              if (fragment.contentLength === 1 && fragment.getContentAtIndex(0) instanceof BranchComponent) {
                parentFragment.insertBefore(fragment.getContentAtIndex(0) as BranchComponent, item.component)
              } else {
                const t = new BlockComponent('p');
                t.slot.from(fragment);
                parentFragment.insertBefore(t, item.component);
              }
            })
          }
          if (slots.after.length) {
            const afterList = new ListComponent(this.tagName);
            afterList.slots.push(...slots.after);
            parentFragment.insertBefore(afterList, item.component);
          }
          parentFragment.cut(parentFragment.indexOf(item.component), 1);
        })
      } else {
        const commonScope = range.getCommonAncestorFragmentScope();
        const commonAncestorFragment = range.commonAncestorFragment;
        const list = new ListComponent(this.tagName);
        const branchComponents: Array<BackboneComponent|BranchComponent> = [];
        const scopes: TBRangeScope[] = [];
        range.getSuccessiveContents().forEach(scope => {
          let fragment = scope.fragment;
          let lastBackboneComponent: BranchComponent|BackboneComponent;
          while (true) {
            if (fragment === commonAncestorFragment) {
              break;
            }
            const parentComponent = renderer.getParentComponent(scope.fragment);
            fragment = renderer.getParentFragment(parentComponent);
            if (parentComponent instanceof BackboneComponent) {
              lastBackboneComponent = parentComponent;
            }
          }
          if (lastBackboneComponent) {
            if (branchComponents.includes(lastBackboneComponent)) {
              return;
            }
            branchComponents.push(lastBackboneComponent);
            const parentFragment = renderer.getParentFragment(lastBackboneComponent);
            const index = parentFragment.indexOf(lastBackboneComponent);
            scopes.push({
              startIndex: index,
              endIndex: index + 1,
              fragment: parentFragment
            })
          } else {
            scopes.push(scope);
          }
        });
        scopes.reverse().forEach(scope => {
          if (scope.startIndex === 0 && scope.endIndex === scope.fragment.contentLength && scope.fragment !== commonAncestorFragment) {
            list.slots.unshift(scope.fragment);
            range.deleteEmptyTree(scope.fragment, commonAncestorFragment);
            return;
          }
          const fragment = new Fragment();
          const contents = scope.fragment.cut(scope.startIndex, scope.endIndex - scope.startIndex);
          contents.contents.forEach(c => fragment.append(c));
          contents.formatRanges.forEach(f => fragment.apply(f));
          list.slots.unshift(fragment);
          if (scope.fragment.contentLength === 0) {
            range.deleteEmptyTree(scope.fragment, commonAncestorFragment);
          }
          if (scope.fragment === range.startFragment) {
            range.setStart(fragment, range.startIndex - scope.startIndex);
          }
          if (scope.fragment === range.endFragment) {
            range.setEnd(fragment, range.endIndex - scope.startIndex);
          }
        });
        if (range.startFragment !== commonAncestorFragment) {
          if (commonScope.startChildComponent && commonScope.startChildComponent instanceof BranchComponent && commonAncestorFragment.indexOf(commonScope.startChildComponent) !== -1) {
            commonAncestorFragment.insertAfter(list, commonScope.startChildComponent);
          } else {
            commonAncestorFragment.insert(list, commonScope.startIndex);
          }
        } else {
          const parentComponent = renderer.getParentComponent(commonAncestorFragment);
          if (parentComponent instanceof DivisionComponent || parentComponent instanceof BackboneComponent) {
            const parentFragment = renderer.getParentFragment(parentComponent);
            const position = parentFragment.indexOf(parentComponent);
            parentFragment.cut(position, 1);
            parentFragment.insert(list, position);
          } else if (parentComponent instanceof BranchComponent) {
            const index = parentComponent.slots.indexOf(commonAncestorFragment);
            const before = parentComponent.clone() as BranchComponent;
            before.slots.splice(index);
            const after = parentComponent.clone() as BranchComponent;
            after.slots.splice(0, index + 1);

            const parentFragment = renderer.getParentFragment(parentComponent);
            const position = parentFragment.indexOf(parentComponent);

            if (after.slots.length) {
              parentFragment.insert(after, position)
            }
            parentFragment.insert(list, position);
            if (before.slots.length) {
              parentFragment.insert(before, position);
            }
            parentFragment.cut(parentFragment.indexOf(parentComponent), 1);
          }
        }
      }
    })
  }
}
