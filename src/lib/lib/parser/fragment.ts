import { Contents } from './contents';
import { Handler } from '../toolbar/handlers/help';
import { MatchState } from '../matcher/matcher';
import { VirtualDom } from './virtual-dom';
import { ViewNode } from './view-node';
import { FRAGMENT_CONTEXT } from './help';

export class FormatRange {
  get length() {
    return this.endIndex - this.startIndex || 0;
  }

  constructor(public startIndex: number,
              public endIndex: number,
              public state: MatchState,
              public handler: Handler,
              public context: Fragment) {
  }

  clone() {
    return new FormatRange(this.startIndex, this.endIndex, this.state, this.handler, this.context);
  }
}

export class Fragment extends ViewNode {
  elementRef: HTMLElement;

  contents = new Contents();
  formatMatrix = new Map<Handler, FormatRange[]>();

  constructor(public tagName = 'p', public parent: Fragment) {
    super();
  }

  apply(format: FormatRange) {
    this.mergeFormat(format);
  }

  render() {
    const dom = document.createElement(this.tagName);
    dom[FRAGMENT_CONTEXT] = this;
    this.elementRef = dom;

    let formats: FormatRange[] = [];
    // 检出所有生效规则
    this.formatMatrix.forEach(value => {
      formats = formats.concat(value);
    });
    // 排序所有生效规则并克隆副本，防止修改原始数据，影响第二次变更检测
    const canApplyFormats = formats.sort((n, m) => {
      const a = n.startIndex - m.startIndex;
      if (a === 0) {
        return m.endIndex - n.endIndex;
      }
      return a;
    }).map(item => item.clone());

    dom.appendChild(new VirtualDom(canApplyFormats, this).build(this.contents));
    return dom;
  }

  mergeFormat(format: FormatRange) {
    const oldFormats = this.formatMatrix.get(format.handler);
    let formatRanges: FormatRange[] = [];

    if (oldFormats) {
      const styleMarks: MatchState[] = [];
      oldFormats.push(format);
      let index = oldFormats.length - 1;
      while (index >= 0) {
        const item = oldFormats[index];
        if (styleMarks.length < item.endIndex) {
          styleMarks.length = item.endIndex;
        }
        styleMarks.fill(item.state, item.startIndex, item.endIndex);
        index--;
      }
      let newFormatRange: FormatRange = null;
      for (let i = 0; i < styleMarks.length; i++) {
        const mark = styleMarks[i];

        if (!mark) {
          continue;
        }
        if (!newFormatRange) {
          newFormatRange = new FormatRange(i, i + 1, mark, format.handler, this);
          formatRanges.push(newFormatRange);
          continue;
        }
        if (mark === newFormatRange.state) {
          newFormatRange.endIndex = i + 1;
        } else {
          newFormatRange = new FormatRange(i, i + 1, mark, format.handler, this);
          formatRanges.push(newFormatRange);
        }
      }
    } else {
      formatRanges.push(format);
    }
    this.formatMatrix.set(format.handler, formatRanges);
  }
}
