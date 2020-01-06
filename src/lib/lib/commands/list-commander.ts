import { Commander, ReplaceModel } from './commander';
import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { Fragment } from '../parser/fragment';
import { CacheData } from '../toolbar/utils/cache-data';
import { RootFragment } from '../parser/root-fragment';

export class ListCommander implements Commander<any> {
  recordHistory = true;

  constructor(private tagName: string) {
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean, rootFragment: RootFragment): void {
    let c = selection.commonAncestorFragment;

    if (overlap) {
      selection.ranges.forEach(range => {
        range.getSelectedScope().forEach(item => {
          const formats = item.context.getFormatRangesByHandler(handler);
          if (formats && formats.length) {
            const index = item.context.getIndexInParent();
            item.context.parent.insertFragmentContents(item.context, index);
            item.context.destroy();
          }
        });
      });

      return;
    }

    selection.ranges.forEach(range => {
      const commonAncestorFragment = range.commonAncestorFragment;
      const listFragment = new Fragment(commonAncestorFragment, rootFragment.parser.getFormatStateByData(new CacheData({
        tag: this.tagName
      })));
      if (range.startFragment === commonAncestorFragment && range.endFragment === commonAncestorFragment) {
        c = range.commonAncestorFragment.parent;
        const index = commonAncestorFragment.getIndexInParent();
        const li = new Fragment(listFragment, rootFragment.parser.getFormatStateByData(new CacheData({
          tag: 'li'
        })));
        li.append(commonAncestorFragment.parent.delete(index, index + 1));
        listFragment.append(li);
        c.insert(listFragment, index);
        return;
      }
      const position = range.getCommonAncestorFragmentScope().startIndex;

      range.getSelectedScope().forEach(item => {
        const li = new Fragment(listFragment, rootFragment.parser.getFormatStateByData(new CacheData({
          tag: 'li'
        })));
        if (item.context.parent === commonAncestorFragment) {
          const index = item.context.getIndexInParent();
          commonAncestorFragment.delete(index, index + 1);
          li.append(item.context);
          listFragment.append(li);
        } else {
          const f = item.context.delete(item.startIndex, item.endIndex);
          li.append(f);
        }
      });
      commonAncestorFragment.insert(listFragment, position);
    });
  }

  render(state: FormatState, rawElement?: HTMLElement, cacheData?: CacheData): ReplaceModel {
    if (state === FormatState.Valid) {
      return new ReplaceModel(document.createElement(cacheData.tag));
    }
    return null;
  }
}
