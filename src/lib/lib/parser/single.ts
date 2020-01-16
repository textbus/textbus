import { ViewData } from './view-data';
import { Fragment } from './fragment';
import { Handler } from '../toolbar/handlers/help';
import { SingleFormat } from './format';
import { FormatDelta } from './parser';
import { FormatState } from '../matcher/matcher';

export class Single extends ViewData {
  private formatMap = new Map<Handler, SingleFormat[]>();
  parent: Fragment;
  constructor(public tagName: string, formats?: FormatDelta[]) {
    super();
    if (Array.isArray(formats)) {
      formats.forEach(item => {
        this.formatMap.set(item.handler, [new SingleFormat({
          ...item,
          context: this
        })])
      })
    }
  }

  getFormatRangesByHandler(handler: Handler) {
    return this.formatMap.get(handler);
  }

  cleanFormats() {
    this.formatMap.clear();
  }

  getFormatHandlers() {
    return Array.from(this.formatMap.keys());
  }

  getFormatRanges() {
    return Array.from(this.formatMap.values()).reduce((v, n) => v.concat(n), []);
  }

  mergeFormat(format: SingleFormat) {
    if (format.state === FormatState.Invalid) {
      this.formatMap.delete(format.handler);
    } else {
      this.formatMap.set(format.handler, [format]);
    }
  }

  setFormats(key: Handler, formatRanges: SingleFormat[]) {
    this.formatMap.set(key, formatRanges);
  }

  clone(): Single {
    const s = new Single(this.tagName);
    s.formatMap = new Map<Handler, SingleFormat[]>();
    Array.from(this.formatMap.keys()).forEach(key => {
      s.formatMap.set(key, this.formatMap.get(key).map(f => {
        return f.clone();
      }));
    });
    return s;
  }

  getCanApplyFormats() {
    let formats: SingleFormat[] = [];
    // 检出所有生效规则
    this.formatMap.forEach(value => {
      formats = formats.concat(value);
    });
    formats.sort((next, prev) => {
      return next.handler.priority - prev.handler.priority;
    });
    return formats;
  }
}
