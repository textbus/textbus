import { TBRange } from '../viewer/range';
import { Renderer } from '../core/renderer';

export class TBSelection {
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
