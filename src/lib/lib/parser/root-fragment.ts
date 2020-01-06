import { Fragment } from './fragment';
import { Single } from './single';
import { BlockFormat } from './format';
import { Parser } from './parser';
import { CacheData } from '../toolbar/utils/cache-data';

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
      const newFragment = new Fragment(this, this.parser.getFormatStateByData(new CacheData({
        tag: 'p'
      })));
      newFragment.append(new Single(newFragment, 'br', this.parser.getFormatStateByData(new CacheData({
        tag: 'br'
      }))));
      this.append(newFragment);
    };

    if (this.contentLength === 0) {
      guardLastContentEditable();
    } else if (last instanceof Fragment) {
      const formats = last.getFormatRanges().filter(i => i instanceof BlockFormat);
      let hasParagraph = false;
      for (const item of formats) {
        if (item.cacheData.tag === 'p') {
          hasParagraph = true;
          break;
        }
      }
      if (!hasParagraph) {
        guardLastContentEditable();
      }
    }
    return super.createVDom();
  }
}
