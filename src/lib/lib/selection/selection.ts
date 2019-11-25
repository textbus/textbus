import { Cursor } from './cursor';
import { fromEvent, merge, Observable, Subject } from 'rxjs';
import { Fragment } from '../parser/fragment';
import { TBRange } from './range';

export class TBSelection {
  cursorElementRef: HTMLElement;
  onSelectionChange: Observable<TBSelection>;
  commonAncestorFragment: Fragment;

  ranges: TBRange[] = [];

  get rangeCount() {
    return this.ranges.length;
  }

  get firstRange() {
    return this.ranges[0] || null;
  }

  get collapsed() {
    return this.ranges.length === 1 && this.firstRange.collapsed;
  }

  readonly cursor: Cursor;

  private selection: Selection;
  private selectionChangeEvent = new Subject<TBSelection>();

  constructor(private context: Document) {
    this.cursor = new Cursor(context);
    this.cursorElementRef = this.cursor.elementRef;
    this.onSelectionChange = this.selectionChangeEvent.asObservable();

    const sub = merge(...['selectstart', 'mousedown'].map(type => fromEvent(context, type))).subscribe(() => {
      this.selection = context.getSelection();
      sub.unsubscribe();
    });

    fromEvent(context, 'selectionchange').subscribe(() => {
      if (!this.selection) {
        return;
      }
      if (this.selection.isCollapsed) {
        if (this.selection.rangeCount) {
          let rect = this.selection.getRangeAt(0).getBoundingClientRect();
          if (!rect.height) {
            rect = (this.selection.focusNode as HTMLElement).getBoundingClientRect();
          }
          this.cursor.show(rect);
        }
      } else {
        this.cursor.hide();
      }
      this.ranges = this.makeRanges();
      this.commonAncestorFragment = this.getCommonFragment(this.ranges);
      this.selectionChangeEvent.next(this);
    });
  }

  apply(offset = 0) {
    this.ranges.forEach(range => {
      range.apply(offset);
    });
  }

  private makeRanges() {
    const selection = this.selection;
    const ranges = [];
    if (selection.rangeCount) {
      for (let i = 0; i < selection.rangeCount; i++) {
        const range = selection.getRangeAt(i);
        ranges.push(new TBRange(range));
      }
    }
    return ranges;
  }

  private getCommonFragment(ranges: TBRange[]): Fragment {
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
