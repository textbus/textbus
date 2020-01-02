import { Fragment } from './fragment';
import { defaultTagsHandler } from '../default-tags-handler';
import { Single } from './single';
import { BlockFormat } from './format';
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
      newFragment.mergeFormat(new BlockFormat({
        state: FormatState.Valid,
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
