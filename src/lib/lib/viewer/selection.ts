import { TBRange } from '../viewer/range';
import { Renderer } from '../core/renderer';

export interface RangePath {
  startPaths: number[];
  endPaths: number[];
}

export class TBSelection {
  get rangeCount() {
    return this._ranges.length;
  }

  get ranges() {
    return this._ranges;
  }

  private _ranges: TBRange[] = [];

  constructor(private nativeSelection: Selection, private renderer: Renderer) {
    for (let i = 0; i < this.nativeSelection.rangeCount; i++) {
      this._ranges.push(new TBRange(this.nativeSelection.getRangeAt(i), this.renderer));
    }
  }

  restore() {
    this._ranges.forEach(range => {
      range.restore();
    });
  }
}
