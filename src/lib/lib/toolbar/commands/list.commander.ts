import {
  Commander,
  TBSelection,
  Renderer,
  Fragment,
  BackboneComponent,
  BranchComponent,
  TBRangeScope
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
          const slots = item.template.split(item.startIndex, item.endIndex);
          const parentFragment = renderer.getParentFragment(item.template);
          if (slots.before.length) {
            const beforeList = new ListComponent(this.tagName);
            beforeList.childSlots.push(...slots.before);
            parentFragment.insertBefore(beforeList, item.template);
          }
          if (slots.center.length) {
            slots.center.forEach(fragment => {
              if (fragment.contentLength === 1 && fragment.getContentAtIndex(0) instanceof BackboneComponent) {
                parentFragment.insertBefore(fragment.getContentAtIndex(0) as BackboneComponent, item.template)
              } else {
                const t = new BlockComponent('p');
                t.slot.from(fragment);
                parentFragment.insertBefore(t, item.template);
              }
            })
          }
          if (slots.after.length) {
            const afterList = new ListComponent(this.tagName);
            afterList.childSlots.push(...slots.after);
            parentFragment.insertBefore(afterList, item.template);
          }
          parentFragment.cut(parentFragment.indexOf(item.template), 1);
        })
      } else {
        const commonScope = range.getCommonAncestorFragmentScope();
        const commonAncestorFragment = range.commonAncestorFragment;
        const list = new ListComponent(this.tagName);
        const backboneTemplates: BackboneComponent[] = [];
        const scopes: TBRangeScope[] = [];
        range.getSuccessiveContents().forEach(scope => {
          let fragment = scope.fragment;
          let lastBackboneTemplate: BackboneComponent;
          while (true) {
            if (fragment === commonAncestorFragment) {
              break;
            }
            const parentTemplate = renderer.getParentTemplate(scope.fragment);
            fragment = renderer.getParentFragment(parentTemplate);
            if (parentTemplate instanceof BackboneComponent && parentTemplate.canSplit() === false) {
              lastBackboneTemplate = parentTemplate;
            }
          }
          if (lastBackboneTemplate) {
            if (backboneTemplates.includes(lastBackboneTemplate)) {
              return;
            }
            backboneTemplates.push(lastBackboneTemplate);
            const parentFragment = renderer.getParentFragment(lastBackboneTemplate);
            const index = parentFragment.indexOf(lastBackboneTemplate);
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
            list.childSlots.unshift(scope.fragment);
            range.deleteEmptyTree(scope.fragment, commonAncestorFragment);
            return;
          }
          const fragment = new Fragment();
          const contents = scope.fragment.cut(scope.startIndex, scope.endIndex - scope.startIndex);
          contents.contents.forEach(c => fragment.append(c));
          contents.formatRanges.forEach(f => fragment.apply(f));
          list.childSlots.unshift(fragment);
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
          if (commonScope.startChildTemplate && commonScope.startChildTemplate instanceof BackboneComponent && commonAncestorFragment.indexOf(commonScope.startChildTemplate) !== -1) {
            commonAncestorFragment.insertAfter(list, commonScope.startChildTemplate);
          } else {
            commonAncestorFragment.insert(list, commonScope.startIndex);
          }
        } else {
          const parentTemplate = renderer.getParentTemplate(commonAncestorFragment);
          if (parentTemplate instanceof BranchComponent) {
            const parentFragment = renderer.getParentFragment(parentTemplate);
            const position = parentFragment.indexOf(parentTemplate);
            parentFragment.cut(position, 1);
            parentFragment.insert(list, position);
          } else {
            const index = parentTemplate.childSlots.indexOf(commonAncestorFragment);
            const before = parentTemplate.clone() as BackboneComponent;
            before.childSlots.splice(index);
            const after = parentTemplate.clone() as BackboneComponent;
            after.childSlots.splice(0, index + 1);

            const parentFragment = renderer.getParentFragment(parentTemplate);
            const position = parentFragment.indexOf(parentTemplate);

            if (after.childSlots.length) {
              parentFragment.insert(after, position)
            }
            parentFragment.insert(list, position);
            if (before.childSlots.length) {
              parentFragment.insert(before, position);
            }
            parentFragment.cut(parentFragment.indexOf(parentTemplate), 1);
          }
        }
      }
    })
  }
}
