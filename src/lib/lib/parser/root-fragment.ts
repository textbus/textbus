import { Fragment } from './fragment';
import { defaultTagsHandler } from '../default-tags-handler';
import { Single } from './single';
import { BlockFormat } from './format';
import { FormatState } from '../matcher/matcher';
import { Parser } from './parser';
import instantiate = WebAssembly.instantiate;

export class RootFragment extends Fragment {
  constructor(public parser: Parser) {
    super(null);
  }

  setContents(el: HTMLElement) {
    this.parser.parse(el, this);
  }

  createVDom() {
    const last = this.getContentAtIndex(this.contentLength - 1);

    const guardLastContentEditable = () => {
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
    };

    if (this.contentLength === 0) {
      guardLastContentEditable();
    } else if (last instanceof Fragment) {
      if (!/p/i.test(last?.vNode?.wrapElement.nodeName)) {
        guardLastContentEditable();
      }
    }
    return super.createVDom();
  }
}
