import { Commander, TBSelection, Renderer, Fragment, Template } from '../../core/_api';
import { ListTemplate, BlockTemplate } from '../../templates/_api';

export class ListCommander implements Commander {
  recordHistory = true;

  constructor(private tagName: 'ol' | 'ul') {
  }

  command(selection: TBSelection, overlap: boolean, renderer: Renderer): void {
    selection.ranges.forEach(range => {
      const commonScope = range.getCommonAncestorFragmentScope();
      if (overlap) {
        const startContext = renderer.getContext(
          range.startFragment,
          ListTemplate,
          instance => instance.tagName === this.tagName);
        const contextFragment = renderer.getParentFragmentByTemplate(startContext);
        const position = contextFragment.indexOf(startContext);
        const templates: Template[] = [];
        range.getSuccessiveContents().reverse().forEach(scope => {
          if (scope.fragment.contentLength === 1 && scope.fragment.getContentAtIndex(0) instanceof Template) {
            templates.push(scope.fragment.getContentAtIndex(0) as Template);
          } else {
            const t = new BlockTemplate('p');
            const fragment = new Fragment();
            t.childSlots.push(fragment);
            const contents = scope.fragment.delete(scope.startIndex, scope.endIndex);
            contents.contents.forEach(c => fragment.append(c));
            contents.formatRanges.forEach(f => fragment.mergeFormat(f));
            templates.push(t);

            if (scope.fragment === range.startFragment &&
              scope.startIndex <= range.startIndex &&
              scope.endIndex >= range.startIndex) {
              range.setStart(fragment, range.startIndex - scope.startIndex);
            }
            if (scope.fragment === range.endFragment &&
              scope.startIndex <= range.endIndex &&
              scope.endIndex >= range.endIndex) {
              range.setEnd(fragment, range.endIndex - scope.startIndex);
            }
          }
          range.deleteEmptyTree(scope.fragment)
        })
        const p = contextFragment.indexOf(startContext) === position ? position + 1 : position;
        templates.forEach(t => contextFragment.insert(t, p));
      } else {
        const list = new ListTemplate(this.tagName);
        range.getSuccessiveContents().reverse().forEach(scope => {
          if (scope.startIndex === 0 && scope.endIndex === scope.fragment.contentLength) {
            list.childSlots.unshift(scope.fragment);
            range.deleteEmptyTree(scope.fragment, range.commonAncestorFragment);
            return;
          }
          const fragment = new Fragment();
          const contents = scope.fragment.delete(scope.startIndex, scope.endIndex - scope.startIndex);
          contents.contents.forEach(c => fragment.append(c));
          contents.formatRanges.forEach(f => fragment.mergeFormat(f));
          list.childSlots.unshift(fragment);
          if (scope.fragment.contentLength === 0) {
            range.deleteEmptyTree(scope.fragment, range.commonAncestorFragment);
          }
          if (scope.fragment === range.startFragment) {
            range.setStart(fragment, range.startIndex - scope.startIndex);
          } else if (scope.fragment === range.endFragment) {
            range.setEnd(fragment, range.endIndex - scope.endIndex);
          }
        });
        if (range.startFragment !== range.commonAncestorFragment) {
          range.commonAncestorFragment.insert(list, commonScope.startIndex);
        } else {
          const parentTemplate = renderer.getParentTemplateByFragment(range.commonAncestorFragment);
          if (parentTemplate.childSlots.length > 1) {
            const index = parentTemplate.childSlots.indexOf(range.commonAncestorFragment);
            const before = parentTemplate.clone();
            before.childSlots.splice(index);
            const after = parentTemplate.clone();
            after.childSlots.splice(0, index + 1);

            const parentFragment = renderer.getParentFragmentByTemplate(parentTemplate);
            const position = parentFragment.indexOf(parentTemplate);

            if (after.childSlots.length) {
              parentFragment.insert(after, position)
            }
            parentFragment.insert(list, position);
            if (before.childSlots.length) {
              parentFragment.insert(before, position);
            }
          } else {
            const parentFragment = renderer.getParentFragmentByTemplate(parentTemplate);
            const position = parentFragment.indexOf(parentTemplate);
            parentFragment.delete(position, 1);
            parentFragment.insert(list, position);
          }
        }
      }
    })
  }
}
