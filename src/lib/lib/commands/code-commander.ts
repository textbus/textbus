import { Commander, ReplaceModel } from './commander';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { FormatState } from '../matcher/matcher';
import { AbstractData } from '../toolbar/utils/abstract-data';
import { Fragment } from '../parser/fragment';
import { Single } from '../parser/single';
import { RootFragment } from '../parser/root-fragment';
import { VElement } from '../renderer/element';

export class CodeCommander implements Commander<string> {
  recordHistory = true;
  private tagName = 'pre';
  private lang = '';

  updateValue(value: string): void {
    this.lang = value;
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean, rootFragment: RootFragment) {
    if (!overlap) {
      selection.collapse();
      const firstRange = selection.firstRange;
      const fragment = firstRange.startFragment;
      const context = fragment.parent;
      const pre = new Fragment(rootFragment.parser.getFormatStateByData(new AbstractData({
        tag: 'pre'
      })));
      pre.append(new Single('br', rootFragment.parser.getFormatStateByData(new AbstractData({
        tag: 'br'
      }))));
      context.insert(pre, selection.firstRange.startFragment.getIndexInParent() + 1);
      const first = fragment.getContentAtIndex(0);
      if (fragment.contentLength === 0 || first instanceof Single && first.tagName === 'br') {
        fragment.destroy();
      }
      firstRange.startIndex = firstRange.endIndex = 0;
      firstRange.startFragment = firstRange.endFragment = pre;
    }
  }

  render(state: FormatState, rawElement?: VElement, matchDesc?: AbstractData): ReplaceModel {
    if (state === FormatState.Valid) {
      const el = new VElement(this.tagName);
      if (this.lang) {
        el.attrs.set('lang', this.lang);
      }
      return new ReplaceModel(el);
    }
    return null;
  }
}
