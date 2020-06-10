import { Commander, TBSelection, Renderer, Fragment, BackboneTemplate, SingleChildTemplate } from '../../core/_api';
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
        const fragment = context.slot;
        const contents = fragment.delete(0);
        contents.contents.reverse().forEach(i => parentFragment.insert(i, position));
        contents.formatRanges.forEach(f => {
          parentFragment.mergeFormat({
            ...f,
            startIndex: f.startIndex + position,
            endIndex: f.endIndex + position
          })
        })
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
        block.slot = fragment;
        const index = range.commonAncestorFragment.indexOf(range.commonAncestorTemplate)
        if (index !== -1) {
          range.commonAncestorFragment.delete(index, 1);
          fragment.append(range.commonAncestorTemplate);
        } else {
          const appendedTemplates: Array<BackboneTemplate | SingleChildTemplate> = [];
          range.getExpandedScope().reverse().forEach(scope => {
            const parentTemplate = renderer.getParentTemplateByFragment(scope.fragment);
            if (appendedTemplates.includes(parentTemplate)) {
              return;
            }
            appendedTemplates.push(parentTemplate);
            const p = renderer.getParentFragmentByTemplate(parentTemplate);
            if (p) {
              p.delete(p.indexOf(parentTemplate), 1);
              fragment.insert(parentTemplate, 0);
              if (p.contentLength === 0) {
                range.deleteEmptyTree(p);
              }
            } else {
              if (scope.fragment === parentFragment) {
                const length = fragment.contentLength;
                const c = scope.fragment.delete(scope.startIndex, scope.endIndex - scope.startIndex);
                c.contents.reverse().forEach(cc => fragment.insert(cc, 0));
                c.formatRanges.forEach(f => fragment.apply({
                  ...f,
                  startIndex: f.startIndex + length,
                  endIndex: f.endIndex + length,
                }))
              } else {
                const parentTemplate = renderer.getParentTemplateByFragment(scope.fragment);
                block.slot.insert(parentTemplate, 0);
              }
            }
          });
        }
        parentFragment.insert(block, position);
      }
    })
  }
}
