import { Commander, ReplaceModel } from './commander';
import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { Fragment } from '../parser/fragment';
import { CacheData } from '../toolbar/utils/cache-data';
import { RootFragment } from '../parser/root-fragment';
import { TBUS_TOKEN } from '../parser/help';
import { Token } from '../renderer/tokens';
import { dtd } from '../dtd';
import { VElement } from '../renderer/element';

export class ListCommander implements Commander<any> {
  recordHistory = true;

  constructor(private tagName: string) {
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean, rootFragment: RootFragment): void {
    if (overlap) {
      const reg = new RegExp(this.tagName, 'i');
      selection.ranges.forEach(range => {
        const commonAncestorFragment = range.commonAncestorFragment;
        let node = commonAncestorFragment.token.elementRef;
        if (reg.test(node.name)) {
          // 选中同一组列表下的多个 li
          const scope = range.getCommonAncestorFragmentScope();
          this.splitList(commonAncestorFragment, scope.startIndex, scope.endIndex + 1);
          return;
        }
        let liFragment: Fragment;
        while (node) {
          if (/li/i.test(node.name) && reg.test(node.parent.name)) {
            liFragment = (node[TBUS_TOKEN] as Token).context;
            break;
          }
          node = node.parent;
        }
        if (liFragment) {
          // 选区在一个 li 下
          const liIndex = liFragment.getIndexInParent();
          this.splitList(liFragment.parent, liIndex, liIndex + 1);
        } else {
          // 选区在多个列表下
          const scope = range.getCommonAncestorFragmentScope();
          const temporaryFragment = new Fragment();
          range.getBlockFragmentsBySelectedScope().forEach(item => {
            const node = item.context.token.elementRef;
            if (/li/i.test(node.name) && reg.test(node.parent.name)) {
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
      return;
    }
    selection.ranges.forEach(range => {
      let insertPosition = range.getCommonAncestorFragmentScope().startIndex;
      let container = range.commonAncestorFragment;

      const listGroup = new Fragment(rootFragment.parser.getFormatStateByData(new CacheData({
        tag: this.tagName
      })));

      range.getBlockFragmentsBySelectedScope().forEach(item => {
        const parent = item.context.parent;
        if (item.startIndex === 0 && item.endIndex === item.context.contentLength) {
          if (item.context === range.commonAncestorFragment) {
            insertPosition = container.getIndexInParent();
            container = container.parent;
          }
          const nativeElement = item.context.token.wrapElement;
          if (/li/i.test(nativeElement.name)) {
            listGroup.append(item.context);
          } else {
            const li = new Fragment(rootFragment.parser.getFormatStateByData(new CacheData({
              tag: 'li'
            })));
            li.append(item.context);
            listGroup.append(li);
          }
        } else {
          const li = new Fragment(rootFragment.parser.getFormatStateByData(new CacheData({
            tag: 'li'
          })));
          li.append(item.context.delete(item.startIndex, item.endIndex));
          listGroup.append(li);
        }
        this.deleteEmptyFragment(parent, container);
      });
      const limitChildren = dtd[container.token.elementRef.name.toLowerCase()]?.limitChildren;
      if (limitChildren) {
        const childFragment = new Fragment(rootFragment.parser.getFormatStateByData(new CacheData({
          tag: limitChildren[0]
        })));
        childFragment.append(listGroup);
        container.insert(childFragment, insertPosition);
        return;
      }
      container.insert(listGroup, insertPosition);
    });
  }

  render(state: FormatState, rawElement?: VElement, cacheData?: CacheData): ReplaceModel {
    if (state === FormatState.Valid) {
      return new ReplaceModel(new VElement(cacheData.tag));
    }
    return null;
  }

  private splitList(listGroup: Fragment, startIndex: number, endIndex: number) {
    let index = listGroup.getIndexInParent();
    const parent = listGroup.parent;
    const last = listGroup.delete(endIndex, listGroup.contentLength);
    const first = listGroup.delete(0, startIndex);
    if (first.contentLength) {
      parent.insert(first, index);
      index++;
    }
    const temporaryFragment = new Fragment();
    listGroup.sliceContents(0).forEach(item => {
      if (item instanceof Fragment) {
        temporaryFragment.insertFragmentContents(item, temporaryFragment.contentLength);
      } else {
        temporaryFragment.append(item);
      }
    });
    if (last.contentLength) {
      parent.insert(last, index);
    }
    parent.insertFragmentContents(temporaryFragment, index);
    listGroup.destroy();
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
