import { Fragment } from './fragment';
import { defaultTagsHandler } from '../default-tags-handler';
import { Single } from './single';
import { FormatRange } from './format';
import { FormatState } from '../matcher/matcher';
import { Parser } from './parser';

export class RootFragment extends Fragment {
  constructor(public parser: Parser) {
    super(null);
  }

  setContents(el: HTMLElement) {
    this.parser.parse(el, this);
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
