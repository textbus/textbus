import { Fragment } from './fragment';
import { Editor } from '../editor';
import { VIRTUAL_NODE } from './help';
import { defaultTagsHandler } from '../default-tags-handler';
import { Single } from './single';
import { FormatRange } from './format';
import { FormatState } from '../matcher/matcher';

export class RootFragment extends Fragment {
  constructor(public editor: Editor) {
    super(null);
  }

  setContents(el: HTMLElement) {
    this.editor.parser.parse(el, this);
  }

  render(host: HTMLElement): HTMLElement {
    if (this.contentLength === 0) {
      const newFragment = new Fragment(this);
      newFragment.append(new Single(newFragment, 'br'));
      newFragment.mergeFormat(new FormatRange({
        state: FormatState.Valid,
        startIndex: 0,
        endIndex: 1,
        handler: defaultTagsHandler,
        context: newFragment,
        cacheData: {
          tag: 'p'
        }
      }));
      this.append(newFragment);
    }
    const dom = super.render(host);
    host[VIRTUAL_NODE] = this.virtualNode;
    return dom;
  }
}
