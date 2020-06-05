import { Commander, TBSelection, Renderer, Fragment } from '../../core/_api';
import { ListTemplate } from '../../templates/list.template';

export class ListCommander implements Commander {
  recordHistory = true;

  constructor(private tagName: 'ol' | 'ul') {
  }

  command(selection: TBSelection, overlap: boolean, renderer: Renderer): void {
    selection.ranges.forEach(range => {
      const commonScope = range.getCommonAncestorFragmentScope();
      if (overlap) {

      } else {
        const list = new ListTemplate(this.tagName);
        range.getSuccessiveContents().reverse().forEach(scope => {
          const fragment = new Fragment();
          const contents = scope.fragment.delete(scope.startIndex, scope.endIndex - scope.startIndex);
          contents.contents.forEach(c => fragment.append(c));
          contents.formatRanges.forEach(f => fragment.mergeFormat(f));
          list.childSlots.push(fragment);
          if (scope.fragment.contentLength === 0) {
            range.deleteEmptyTree(scope.fragment, range.commonAncestorFragment);
          }
        });
        range.commonAncestorFragment.insert(list, commonScope.startIndex);
      }
    })
  }
}
