import { Fragment } from './fragment';
import { TBus } from '../tbus';
import { Parser } from './parser';
import { VIRTUAL_NODE } from './help';
import { defaultHandlers } from '../default-handlers';
import { Single } from './single';
import { FormatRange } from './format';
import { FormatState } from '../matcher/matcher';

export class RootFragment extends Fragment {
  constructor(private parser: Parser, public editor: TBus) {
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
      handler: defaultHandlers,
      context: newFragment,
      cacheData: {
        tag: 'p'
      }
    }));
    if (last instanceof Fragment) {
      const formatRange = last.formatMatrix.get(defaultHandlers);
      if (!formatRange || formatRange[formatRange.length - 1].cacheData.tag === 'p') {
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
