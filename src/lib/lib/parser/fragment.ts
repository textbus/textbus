import { Contents } from './contents';
import { Handler } from '../toolbar/handlers/help';
import { MatchState } from '../matcher/matcher';

export class StyleRange {
  get length() {
    return this.endIndex - this.startIndex || 0;
  }

  constructor(public startIndex: number,
              public endIndex: number,
              public state: MatchState,
              public handler: Handler,
              public context: Fragment) {
  }
}

export class Fragment {
  get length() {
    return this.contents.length;
  }

  contents = new Contents();

  styleMatrix = new Map<Handler, StyleRange[]>();

  constructor(public tagName = 'p') {
  }

  ast(tagName?: string): DocumentFragment {
    const fragment = document.createDocumentFragment();

    let styles: StyleRange[] = [];
    this.styleMatrix.forEach(value => {
      styles = styles.concat(value);
    });
    const canApplyStyles = styles.sort((n, m) => {
      return n.startIndex - m.startIndex;
    });

    console.log(canApplyStyles)

    for (const item of this.contents) {
      if (typeof item === 'string') {

      } else if (item instanceof Fragment) {
        item.ast();
      }
      console.log(item);
    }

    return fragment;
  }
}
