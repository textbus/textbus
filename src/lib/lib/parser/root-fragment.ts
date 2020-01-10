import { Fragment } from './fragment';
import { Single } from './single';
import { BlockFormat } from './format';
import { Parser } from './parser';
import { AbstractData } from '../toolbar/utils/abstract-data';

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
      const newFragment = new Fragment(this.parser.getFormatStateByData(new AbstractData({
        tag: 'p'
      })));
      newFragment.append(new Single('br', this.parser.getFormatStateByData(new AbstractData({
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
        if (item.abstractData.tag === 'p') {
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
