import { TBRange } from '../viewer/range';
import { Renderer } from '../core/renderer';

export interface RangePath {
  startPaths: number[];
  endPaths: number[];
}

export class TBSelection {
  get rangeCount() {
    return this.ranges.length;
  }

  get ranges() {
    const ranges: TBRange[] = [];
    for (let i = 0; i < this.nativeSelection.rangeCount; i++) {
      ranges.push(new TBRange(this.nativeSelection.getRangeAt(i), this.renderer));
    }
    return ranges;
  }

  constructor(private nativeSelection: Selection, private renderer: Renderer) {
  }
}
