import { Commander, ReplaceModel } from './commander';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { FormatState } from '../matcher/matcher';
import { CacheData } from '../toolbar/utils/cache-data';
import { Fragment } from '../parser/fragment';
import { Single } from '../parser/single';
import { BlockFormat } from '../parser/format';

export class CodeCommander implements Commander<string> {
  recordHistory = true;
  private tagName = 'pre';
  private lang = '';

  updateValue(value: string): void {
    this.lang = value;
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean) {
    if (!overlap) {
      selection.collapse();
      const firstRange = selection.firstRange;
      const fragment = firstRange.startFragment;
      const context = fragment.parent;
      const pre = new Fragment(context);
      pre.mergeFormat(new BlockFormat({
        state: FormatState.Valid,
        context: pre,
        handler,
        cacheData: {
          tag: 'pre'
        }
      }));
      pre.append(new Single(pre, 'br'));
      context.insert(pre, selection.firstRange.startFragment.getIndexInParent() + 1);
      const first = fragment.getContentAtIndex(0);
      if (fragment.contentLength === 0 || first instanceof Single && first.tagName === 'br') {
        fragment.destroy();
      }
      firstRange.startIndex = firstRange.endIndex = 0;
      firstRange.startFragment = firstRange.endFragment = pre;
    }
  }

  render(state: FormatState, rawElement?: HTMLElement, matchDesc?: CacheData): ReplaceModel {
    if (state === FormatState.Valid) {
      const el = document.createElement(this.tagName);
      if (this.lang) {
        el.setAttribute('lang', this.lang);
      }
      return new ReplaceModel(el);
    }
    return null;
  }
}
