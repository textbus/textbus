import { Commander, TBSelection, Renderer, Fragment, Template } from '../../core/_api';
import { BlockTemplate } from '../../templates/block.template';

export class ToggleBlockCommander implements Commander<string> {
  recordHistory = true;

  constructor(private tagName: string) {
  }

  command(selection: TBSelection, overlap: boolean, renderer: Renderer) {
    selection.ranges.forEach(range => {
      if (overlap) {
        const context = renderer.getContext(range.commonAncestorFragment,
          BlockTemplate,
          instance => {
            return instance.tagName === this.tagName;
          });
        const parentFragment = renderer.getParentFragmentByTemplate(context);
        const position = parentFragment.indexOf(context);
        parentFragment.delete(position, 1);
        context.childSlots.reverse().forEach(fragment => {
          const contents = fragment.delete(0);
          contents.contents.reverse().forEach(i => parentFragment.insert(i, position));
          contents.formatRanges.forEach(f => {
            parentFragment.mergeFormat({
              ...f,
              startIndex: f.startIndex + position,
              endIndex: f.endIndex + position
            })
          })
        });
      } else {
        let position: number;
        let parentFragment: Fragment;
        if (range.startFragment === range.endFragment) {
          const parentTemplate = renderer.getParentTemplateByFragment(range.startFragment)
          parentFragment = renderer.getParentFragmentByTemplate(parentTemplate);
          position = parentFragment.indexOf(parentTemplate);
        } else {
          position = range.getCommonAncestorFragmentScope().startIndex;
          parentFragment = range.commonAncestorFragment;
        }

        const block = new BlockTemplate(this.tagName);
        const fragment = new Fragment();
        block.childSlots.push(fragment);
        range.getExpandedScope().reverse().forEach(scope => {
          if (scope.startIndex === 0 && scope.endIndex === scope.fragment.contentLength) {
            const parentTemplate = renderer.getParentTemplateByFragment(scope.fragment);
            const p = renderer.getParentFragmentByTemplate(parentTemplate);
            p.delete(p.indexOf(parentTemplate), 1);
            fragment.insert(parentTemplate, 0);
            if (p.contentLength === 0) {
              range.deleteEmptyTree(p);
            }
          } else {
            const t = new BlockTemplate('p');
            const childFragment = new Fragment();
            t.childSlots.push(childFragment);
            const contents = scope.fragment.delete(scope.startIndex, scope.endIndex);
            contents.contents.forEach(c => childFragment.append(c));
            contents.formatRanges.forEach(f => childFragment.mergeFormat(f));
            fragment.insert(t, 0);

            if (scope.fragment === range.startFragment &&
              scope.startIndex <= range.startIndex &&
              scope.endIndex >= range.startIndex) {
              range.setStart(childFragment, range.startIndex - scope.startIndex);
            }
            if (scope.fragment === range.endFragment &&
              scope.startIndex <= range.endIndex &&
              scope.endIndex >= range.endIndex) {
              range.setEnd(childFragment, range.endIndex - scope.startIndex);
            }
            range.deleteEmptyTree(scope.fragment)
          }

        });
        parentFragment.insert(block, position);
      }
    })
  }
}
