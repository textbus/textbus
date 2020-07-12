import { Commander, TBSelection, Renderer, Fragment, BackboneComponent, BranchComponent } from '../../core/_api';
import { BlockComponent } from '../../components/block.component';

export class ToggleBlockCommander implements Commander<string> {
  recordHistory = true;

  constructor(private tagName: string) {
  }

  command(selection: TBSelection, overlap: boolean, renderer: Renderer) {
    selection.ranges.forEach(range => {
      if (overlap) {
        const context = renderer.getContext(range.commonAncestorFragment,
          BlockComponent,
          instance => {
            return instance.tagName === this.tagName;
          });
        const parentFragment = renderer.getParentFragment(context);
        const position = parentFragment.indexOf(context);
        parentFragment.cut(position, 1);
        const fragment = context.slot;
        const contents = fragment.cut(0);
        contents.contents.reverse().forEach(i => parentFragment.insert(i, position));
        contents.formatRanges.forEach(f => {
          parentFragment.apply({
            ...f,
            startIndex: f.startIndex + position,
            endIndex: f.endIndex + position
          })
        })
      } else {
        let position: number;
        let parentFragment: Fragment;
        const block = new BlockComponent(this.tagName);
        const fragment = block.slot;
        if (range.startFragment === range.endFragment) {
          const parentComponent = renderer.getParentComponent(range.startFragment)
          parentFragment = renderer.getParentFragment(parentComponent);
          position = parentFragment.indexOf(parentComponent);
          fragment.append(parentComponent);
          parentFragment.cut(position, 1);
          parentFragment.insert(block, position);
        } else {
          position = range.getCommonAncestorFragmentScope().startIndex;
          parentFragment = range.commonAncestorFragment;

          const index = range.commonAncestorFragment.indexOf(range.commonAncestorComponent)
          if (index !== -1) {
            range.commonAncestorFragment.cut(index, 1);
            fragment.append(range.commonAncestorComponent);
          } else {
            const appendedComponents: Array<BackboneComponent | BranchComponent> = [];
            range.getExpandedScope().reverse().forEach(scope => {
              const parentComponent = renderer.getParentComponent(scope.fragment);
              if (appendedComponents.includes(parentComponent)) {
                return;
              }
              appendedComponents.push(parentComponent);
              const p = renderer.getParentFragment(parentComponent);
              if (p) {
                p.cut(p.indexOf(parentComponent), 1);
                fragment.insert(parentComponent, 0);
                if (p.contentLength === 0) {
                  range.deleteEmptyTree(p);
                }
              } else {
                if (scope.fragment === parentFragment) {
                  const length = fragment.contentLength;
                  const c = scope.fragment.cut(scope.startIndex, scope.endIndex - scope.startIndex);
                  c.contents.reverse().forEach(cc => fragment.insert(cc, 0));
                  c.formatRanges.forEach(f => fragment.apply({
                    ...f,
                    startIndex: f.startIndex + length,
                    endIndex: f.endIndex + length,
                  }))
                } else {
                  const parentComponent = renderer.getParentComponent(scope.fragment);
                  block.slot.insert(parentComponent, 0);
                }
              }
            });
          }
          parentFragment.insert(block, position);
        }
      }
    })
  }
}
