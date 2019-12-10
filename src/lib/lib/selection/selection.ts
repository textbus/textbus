import { fromEvent, merge, Observable, Subject } from 'rxjs';

import { Fragment } from '../parser/fragment';
import { TBRange } from './range';

export class TBSelection {
  onSelectionChange: Observable<TBSelection>;

  get ranges(): TBRange[] {
    return this._ranges;
  };

  get commonAncestorFragment() {
    return this.getCommonFragment();
  };

  get rangeCount() {
    return this.ranges.length;
  }

  get firstRange() {
    return this.ranges[0] || null;
  }

  get lastRange() {
    return this.ranges[this.ranges.length - 1] || null;
  }

  get collapsed() {
    return this.ranges.length === 1 && this.firstRange.collapsed;
  }

  get focusNode() {
    return this.selection.focusNode;
  }

  private selection: Selection;
  private selectionChangeEvent = new Subject<TBSelection>();

  private _ranges: TBRange[] = [];

  constructor(private context: Document, private listenEvent = false) {
    this.onSelectionChange = this.selectionChangeEvent.asObservable();
    if (listenEvent) {
      const sub = merge(...['selectstart', 'mousedown'].map(type => fromEvent(context, type))).subscribe(() => {
        this.selection = context.getSelection();
        sub.unsubscribe();
      });

      fromEvent(context, 'selectionchange').subscribe(() => {
        if (!this.selection) {
          return;
        }
        this._ranges = this.makeRanges();
        this.selectionChangeEvent.next(this);
      });
    }
  }

  removeAllRanges() {
    this.selection.removeAllRanges();
    this._ranges = [];
  }

  addRange(range: TBRange) {
    this.selection.addRange(range.rawRange);
    this._ranges.push(range);
  }

  clone() {
    const t = new TBSelection(this.context);
    t._ranges = this.ranges.map(r => r.clone());
    return t;
  }

  apply(offset = 0) {
    this.ranges.forEach(range => {
      range.apply(offset);
    });
  }

  collapse(toEnd = false) {
    const range = toEnd ? this.lastRange : this.firstRange;
    range.collapse(toEnd);
    this._ranges = [range];
    this.apply();
  }

  private makeRanges() {
    const selection = this.selection;
    const ranges = [];
    if (selection && selection.rangeCount) {
      for (let i = 0; i < selection.rangeCount; i++) {
        const range = selection.getRangeAt(i);
        ranges.push(new TBRange(range));
      }
    }
    return ranges;
  }

  private getCommonFragment(): Fragment {
    const ranges = this.ranges || [];
    if (ranges.length === 1) {
      return ranges[0].commonAncestorFragment;
    }

    const depth: Fragment[][] = [];

    ranges.map(range => range.commonAncestorFragment).forEach(fragment => {
      const tree = [];
      while (fragment) {
        tree.push(fragment);
        fragment = fragment.parent;
      }
      depth.push(tree);
    });

    let fragment: Fragment = null;

    while (true) {
      const firstFragments = depth.map(arr => arr.shift());
      if (firstFragments.length === depth.length) {
        if (new Set(firstFragments).size === 1) {
          fragment = firstFragments[0];
        } else {
          break;
        }
      }
    }
    return fragment;
  }
}
