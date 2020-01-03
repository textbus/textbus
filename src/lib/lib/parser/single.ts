import { View } from './view';
import { Fragment } from './fragment';
import { Handler } from '../toolbar/handlers/help';
import { FormatRange } from './format';
import { getCanApplyFormats, mergeFormat } from './utils';

export class Single extends View {
  private formatMatrix = new Map<Handler, FormatRange[]>();

  constructor(public parent: Fragment, public tagName: string) {
    super();
  }

  getFormatRangesByHandler(handler: Handler) {
    return this.formatMatrix.get(handler);
  }

  cleanFormats() {
    this.formatMatrix.clear();
  }

  getFormatHandlers() {
    return Array.from(this.formatMatrix.keys());
  }

  getFormatRanges() {
    return Array.from(this.formatMatrix.values()).reduce((v, n) => v.concat(n), []);
  }

  mergeFormat(format: FormatRange, important = false) {
    mergeFormat(this.formatMatrix, format, important);
  }

  setFormats(key: Handler, formatRanges: FormatRange[]) {
    this.formatMatrix.set(key, formatRanges);
  }

  clone(): Single {
    const s = new Single(this.parent, this.tagName);
    s.formatMatrix = new Map<Handler, FormatRange[]>();
    Array.from(this.formatMatrix.keys()).forEach(key => {
      s.formatMatrix.set(key, this.formatMatrix.get(key).map(f => {
        return f.clone();
      }));
    });
    return s;
  }

  getCanApplyFormats() {
    return getCanApplyFormats(this.formatMatrix);
  }
}
