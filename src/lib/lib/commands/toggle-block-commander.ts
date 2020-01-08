import { Commander, ReplaceModel } from './commander';
import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { Fragment } from '../parser/fragment';
import { VIRTUAL_NODE } from '../parser/help';
import { VNode } from '../renderer/virtual-dom';
import { RootFragment } from '../parser/root-fragment';
import { CacheData } from '../toolbar/utils/cache-data';

export class ToggleBlockCommander implements Commander {
  recordHistory = true;

  constructor(private tagName: string) {
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean, rootFragment: RootFragment): void {
    if (overlap) {
      const reg = new RegExp(this.tagName, 'i');
      selection.ranges.forEach(range => {
        const commonAncestorFragment = range.commonAncestorFragment;
        let node = commonAncestorFragment.vNode.nativeElement;
        let container: Fragment;
        while (node) {
          if (reg.test(node.nodeName)) {
            container = (node[VIRTUAL_NODE] as VNode).context;
            break;
          }
          node = node.parentNode;
        }
        if (container) {
          // 在一个 block 内
          const index = container.getIndexInParent();
          container.parent.insertFragmentContents(container, index);
          container.destroy();
        } else {
          // 选中多个 block
          const scope = range.getCommonAncestorFragmentScope();
          const temporaryFragment = new Fragment();
          range.getBlockFragmentsBySelectedScope().forEach(item => {
            const node = item.context.vNode.nativeElement;
            if (reg.test(node.parentNode.nodeName)) {
              temporaryFragment.insertFragmentContents(item.context, temporaryFragment.contentLength);
              this.deleteEmptyFragment(item.context, commonAncestorFragment);
            } else {
              const p = item.context.parent;
              temporaryFragment.append(item.context);
              this.deleteEmptyFragment(p, commonAncestorFragment);
            }
          });
          commonAncestorFragment.insertFragmentContents(temporaryFragment, scope.startIndex);
        }
      });
    } else {
      selection.ranges.forEach(range => {
        const commonAncestorFragment = range.commonAncestorFragment;
        const temporaryFragment = new Fragment(rootFragment.parser.getFormatStateByData(new CacheData({
          tag: this.tagName
        })));
        const index = range.getCommonAncestorFragmentScope().startIndex;
        range.getBlockFragmentsBySelectedScope().forEach(item => {
          const parent = item.context.parent;
          temporaryFragment.append(item.context);
          this.deleteEmptyFragment(parent, commonAncestorFragment);
        });
        commonAncestorFragment.insert(temporaryFragment, index);
      });
    }
  }

  render(state: FormatState, rawElement?: HTMLElement): ReplaceModel {
    if (state === FormatState.Valid) {
      return new ReplaceModel(document.createElement(this.tagName));
    }
    return null;
  }

  private deleteEmptyFragment(fragment: Fragment, scope: Fragment) {
    if (!fragment || fragment === scope) {
      return;
    }
    const parent = fragment.parent;
    if (fragment.contentLength === 0) {
      fragment.destroy();
    }
    this.deleteEmptyFragment(parent, scope);
  }
}
