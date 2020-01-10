import { Commander, ReplaceModel } from './commander';
import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { Fragment } from '../parser/fragment';
import { TBUS_TOKEN } from '../parser/help';
import { Token } from '../renderer/tokens';
import { RootFragment } from '../parser/root-fragment';
import { CacheData } from '../toolbar/utils/cache-data';
import { VElement } from '../renderer/element';

export class ToggleBlockCommander implements Commander {
  recordHistory = true;

  constructor(private tagName: string) {
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean, rootFragment: RootFragment): void {
    if (overlap) {
      const reg = new RegExp(this.tagName, 'i');
      selection.ranges.forEach(range => {
        const commonAncestorFragment = range.commonAncestorFragment;
        let node = commonAncestorFragment.token.elementRef;
        let container: Fragment;
        while (node) {
          if (reg.test(node.name)) {
            container = (node[TBUS_TOKEN] as Token).context;
            break;
          }
          node = node.parent;
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
            const node = item.context.token.elementRef;
            if (reg.test(node.parent.name)) {
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
        if (range.startFragment === commonAncestorFragment && range.endFragment === commonAncestorFragment) {
          const index = commonAncestorFragment.getIndexInParent();
          const parent = commonAncestorFragment.parent;
          temporaryFragment.append(commonAncestorFragment);
          parent.insert(temporaryFragment, index);
          return;
        }
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

  render(state: FormatState): ReplaceModel {
    if (state === FormatState.Valid) {
      return new ReplaceModel(new VElement(this.tagName));
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
