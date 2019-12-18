import { Fragment } from './fragment';
import { Editor } from '../editor';
import { Parser } from './parser';
import { VIRTUAL_NODE } from './help';

export class RootFragment extends Fragment {
  constructor(private parser: Parser, public editor: Editor) {
    super(null);
  }

  setContents(el: HTMLElement) {
    this.parser.parse(el, this);
  }

  render(host: HTMLElement, nextSibling?: Node): HTMLElement {
    const dom = super.render(host, nextSibling);
    host[VIRTUAL_NODE] = this.virtualNode;
    return dom;
  }
}
