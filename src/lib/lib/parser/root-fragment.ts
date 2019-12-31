import { Fragment } from './fragment';
import { Editor } from '../editor';
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

  createVDom() {
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

    return super.createVDom();
  }
}
