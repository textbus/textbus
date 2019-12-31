import { Commander, ReplaceModel } from './commander';
import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { unwrap, wrap } from './utils';
import { AttrState } from '../toolbar/formats/forms/help';
import { CacheData } from '../toolbar/utils/cache-data';

export class BlockquoteCommander implements Commander<AttrState[]> {
  recordHistory = true;
  private attrs: AttrState[] = [];
  private tagName = 'blockquote';

  updateValue(value: AttrState[]): void {
    this.attrs = value;
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean) {
    const attrs = new Map<string, string>();
    this.attrs.forEach(attr => {
      attrs.set(attr.name, attr.value.toString());
    });
    if (overlap) {
      unwrap(selection, handler);
    } else {
      unwrap(selection, handler);
      wrap(selection, handler, this.tagName, attrs);
    }
  }

  render(state: FormatState, rawElement?: HTMLElement, cacheData?: CacheData): ReplaceModel {
    if (state === FormatState.Valid) {
      const el = document.createElement(this.tagName);
      if (cacheData.attrs && cacheData.attrs.get('cite')) {
        el.setAttribute('cite', cacheData.attrs.get('cite'));
      }
      return new ReplaceModel(el);
    }
    return null;
  }
}
