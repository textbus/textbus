import { Fragment } from './fragment';
import { Editor } from '../editor';
import { Parser } from './parser';

export class RootFragment extends Fragment {
  constructor(private parser: Parser, public editor: Editor) {
    super(null);
  }

  setContents(el: HTMLElement) {
    this.parser.parse(el, this);
  }
}
