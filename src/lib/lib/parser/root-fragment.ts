import { Fragment } from './fragment';
import { Editor } from '../editor';
import { Parser } from './parser';
import { VIRTUAL_NODE } from './help';
import { defaultHandlersMap } from '../default-handlers';
import { Single } from './single';
import { FormatRange } from './format';
import { FormatState } from '../matcher/matcher';

export class RootFragment extends Fragment {
  constructor(private parser: Parser, public editor: Editor) {
    super(null);
  }

  setContents(el: HTMLElement) {
    this.parser.parse(el, this);
  }

  render(host: HTMLElement, nextSibling?: Node): HTMLElement {
    const last = this.contents.getContentAtIndex(this.contents.length - 1);
    const newFragment = new Fragment(this);
    newFragment.append(new Single(newFragment, 'br'));
    newFragment.mergeFormat(new FormatRange({
      state: FormatState.Valid,
      startIndex: 0,
      endIndex: 1,
      handler: defaultHandlersMap.get('p'),
      context: newFragment,
      cacheData: {
        tag: 'p'
      }
    }));
    if (last instanceof Fragment) {
      if (!last.formatMatrix.get(defaultHandlersMap.get('p'))) {
        this.append(newFragment);
      }
    } else {
      this.append(newFragment);
    }
    const dom = super.render(host, nextSibling);
    host[VIRTUAL_NODE] = this.virtualNode;
    return dom;
  }
}
