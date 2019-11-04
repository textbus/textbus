import { Cursor } from './cursor';
import { fromEvent, Observable, Subject } from 'rxjs';
import { Fragment } from '../parser/fragment';
import { TBRange } from './range';

export class TBSelection {
  cursorElementRef: HTMLElement;
  onSelectionChange: Observable<Selection>;
  commonFragment: Fragment;
  anchorFragment: Fragment;
  focusFragment: Fragment;

  ranges: TBRange[] = [];

  get firstRange() {
    return this.ranges[0] || null;
  }

  private cursor: Cursor;

  private selection: Selection;
  private selectionChangeEvent = new Subject<Selection>();

  constructor(private context: Document) {
    this.cursor = new Cursor(context);
    this.cursorElementRef = this.cursor.elementRef;
    this.onSelectionChange = this.selectionChangeEvent.asObservable();

    fromEvent(context, 'selectstart').subscribe(() => {
      this.selection = context.getSelection();
    });

    fromEvent(context, 'selectionchange').subscribe(() => {
      if (this.selection.isCollapsed) {
        let rect = this.selection.getRangeAt(0).getBoundingClientRect();
        if (!rect.height) {
          rect = (this.selection.focusNode as HTMLElement).getBoundingClientRect();
        }
        this.cursor.show(rect);
      } else {
        this.cursor.hide();
      }
      this.ranges = this.makeRanges();
      this.commonFragment = this.getCommonFragment(this.ranges);
      this.selectionChangeEvent.next(this.selection);
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

  getCommonFragment(ranges: TBRange[]): Fragment {
    if (ranges.length === 1) {
      return ranges[0].commonFragment;
    }

    const depth: Fragment[][] = [];

    ranges.map(range => range.commonFragment).forEach(fragment => {
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
