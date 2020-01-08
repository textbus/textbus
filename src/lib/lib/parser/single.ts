import { View } from './view';
import { Fragment } from './fragment';
import { Handler } from '../toolbar/handlers/help';
import { SingleFormat } from './format';
import { ParseState } from './parser';
import { FormatState } from '../matcher/matcher';

export class Single extends View {
  private formatMatrix = new Map<Handler, SingleFormat[]>();
  parent: Fragment;
  constructor(public tagName: string, formats?: ParseState[]) {
    super();
    if (Array.isArray(formats)) {
      formats.forEach(item => {
        this.formatMatrix.set(item.handler, [new SingleFormat({
          ...item,
          context: this
        })])
      })
    }
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

  mergeFormat(format: SingleFormat) {
    if (format.state === FormatState.Invalid) {
      this.formatMatrix.delete(format.handler);
    } else {
      this.formatMatrix.set(format.handler, [format]);
    }
  }

  setFormats(key: Handler, formatRanges: SingleFormat[]) {
    this.formatMatrix.set(key, formatRanges);
  }

  clone(): Single {
    const s = new Single(this.tagName);
    s.formatMatrix = new Map<Handler, SingleFormat[]>();
    Array.from(this.formatMatrix.keys()).forEach(key => {
      s.formatMatrix.set(key, this.formatMatrix.get(key).map(f => {
        return f.clone();
      }));
    });
    return s;
  }

  getCanApplyFormats() {
    let formats: SingleFormat[] = [];
    // 检出所有生效规则
    this.formatMatrix.forEach(value => {
      formats = formats.concat(value);
    });
    formats.sort((next, prev) => {
      return next.handler.priority - prev.handler.priority;
    });
    return formats;
  }
}
