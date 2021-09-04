import {
  Fragment,
  BranchAbstractComponent,
  DivisionAbstractComponent,
  TBRangeScope, BackboneAbstractComponent, TBRange
} from '@textbus/core';
import { ListComponent, BlockComponent } from '@textbus/components';

import { CommandContext, Commander } from '../commander';

interface ContentPosition {
  startIndex: number;
  endIndex: number;
  fragment: Fragment;
}

export class ListCommander implements Commander<null> {
  recordHistory = true;

  constructor(private tagName: 'ol' | 'ul') {
  }

  command(context: CommandContext): void {
    const {selection, overlap} = context;
    selection.ranges.forEach(range => {
      if (overlap) {
        range.getSlotRange(ListComponent, instance => instance.tagName === this.tagName).forEach(item => {
          const slots = item.component.split(item.startIndex, item.endIndex);
          const parentFragment = item.component.parentFragment;
          if (slots.before.length) {
            const beforeList = new ListComponent(this.tagName);
            beforeList.slots.push(...slots.before);
            parentFragment.insertBefore(beforeList, item.component);
          }
          if (slots.center.length) {
            slots.center.forEach(fragment => {
              if (fragment.length === 1 && fragment.getContentAtIndex(0) instanceof BranchAbstractComponent) {
                parentFragment.insertBefore(fragment.getContentAtIndex(0) as BranchAbstractComponent, item.component)
              } else {
                const t = new BlockComponent('p');
                if (fragment === range.startFragment) {
                  range.startFragment = t.slot;
                }
                if (fragment === range.endFragment) {
                  range.endFragment = t.slot;
                }
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
          const index = parentFragment.indexOf(item.component);
          parentFragment.cut(index, index + 1);
        })
      } else {
        const commonAncestorComponent = range.commonAncestorComponent;

        const commonScope = range.getCommonAncestorFragmentScope();
        const commonAncestorFragment = range.commonAncestorFragment;
        const startFragment = range.startFragment;

        if (commonAncestorComponent instanceof BranchAbstractComponent) {
          const parentFragment = commonAncestorComponent.parentFragment;
          const endSlotIndex = commonAncestorComponent.slots.indexOf(commonScope.endChildFragment);
          if (endSlotIndex < commonAncestorComponent.slots.length - 1) {
            const afterComponent = commonAncestorComponent.clone() as BranchAbstractComponent;
            afterComponent.slots.splice(0, endSlotIndex + 1);
            parentFragment.insertAfter(afterComponent, commonAncestorComponent);
            commonAncestorComponent.slots.length = endSlotIndex + 1;
          }
          const startSlotIndex = commonAncestorComponent.slots.indexOf(commonScope.startChildFragment);
          const list = new ListComponent(this.tagName);
          list.slots.push(...commonAncestorComponent.slots.splice(startSlotIndex, endSlotIndex + 1));
          parentFragment.insertAfter(list, commonAncestorComponent);

          if (commonAncestorComponent.slots.length === 0) {
            const index = parentFragment.indexOf(commonAncestorComponent);
            parentFragment.remove(index, index + 1);
          }

          return;
        }

        const scopes = this.getMovableContents(range, commonAncestorFragment);
        const list = this.buildNewList(scopes, commonAncestorFragment, range);

        if (startFragment !== commonAncestorFragment) {
          if (commonAncestorFragment.indexOf(commonScope.startChildComponent) !== -1) {
            commonAncestorFragment.insertAfter(list, commonScope.startChildComponent);
          } else {
            commonAncestorFragment.insert(list, commonScope.startIndex);
          }
        } else {
          const parentComponent = commonAncestorFragment.parentComponent;
          if (parentComponent instanceof DivisionAbstractComponent || parentComponent instanceof BackboneAbstractComponent) {
            const parentFragment = parentComponent.parentFragment;
            const position = parentFragment.indexOf(parentComponent);
            parentFragment.cut(position, position + 1);
            parentFragment.insert(list, position);
          } else if (parentComponent instanceof BranchAbstractComponent) {
            const index = parentComponent.slots.indexOf(commonAncestorFragment);
            const before = parentComponent.clone() as BranchAbstractComponent;
            before.slots.splice(index);
            const after = parentComponent.clone() as BranchAbstractComponent;
            after.slots.splice(0, index + 1);

            const parentFragment = parentComponent.parentFragment;
            const position = parentFragment.indexOf(parentComponent);

            if (after.slots.length) {
              parentFragment.insert(after, position)
            }
            parentFragment.insert(list, position);
            if (before.slots.length) {
              parentFragment.insert(before, position);
            }
            const i = parentFragment.indexOf(parentComponent);
            parentFragment.cut(i, i + 1);
          }
        }
      }
    })
  }

  private buildNewList(scopes: ContentPosition[],
                       commonAncestorFragment: Fragment,
                       range: TBRange) {
    const list = new ListComponent(this.tagName);
    scopes.reverse().forEach(scope => {
      if (scope.startIndex === 0 && scope.endIndex === scope.fragment.length && scope.fragment !== commonAncestorFragment) {
        range.deleteEmptyTree(scope.fragment, commonAncestorFragment);
        list.slots.unshift(scope.fragment);
        return;
      }
      const fragment = new Fragment();
      fragment.from(scope.fragment.cut(scope.startIndex, scope.endIndex));

      list.slots.unshift(fragment);
      if (scope.fragment.length === 0) {
        range.deleteEmptyTree(scope.fragment, commonAncestorFragment);
      }
      if (scope.fragment === range.startFragment) {
        range.setStart(fragment, range.startIndex - scope.startIndex);
      }
      if (scope.fragment === range.endFragment) {
        range.setEnd(fragment, range.endIndex - scope.startIndex);
      }
    });
    return list
  }

  private getMovableContents(range: TBRange, commonAncestorFragment: Fragment): ContentPosition[] {
    const scopes: TBRangeScope[] = [];
    const backboneComponents: Array<BackboneAbstractComponent> = [];
    range.getSuccessiveContents().forEach(scope => {
      let fragment = scope.fragment;
      let lastBackboneComponent: BackboneAbstractComponent;
      while (true) {
        if (fragment === commonAncestorFragment) {
          break;
        }
        const parentComponent = fragment.parentComponent;
        fragment = parentComponent.parentFragment;
        if (parentComponent instanceof BackboneAbstractComponent) {
          lastBackboneComponent = parentComponent;
        }
      }
      if (lastBackboneComponent) {
        if (backboneComponents.includes(lastBackboneComponent)) {
          return;
        }
        backboneComponents.push(lastBackboneComponent);
        const parentFragment = lastBackboneComponent.parentFragment;
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
    return scopes;
  }
}
