import { Contents } from './contents';
import { Handler } from '../toolbar/handlers/help';
import { MatchState } from '../matcher/matcher';
import { VirtualElementNode, VirtualNode } from './virtual-dom';
import { ViewNode } from './view-node';
import { FRAGMENT_CONTEXT, VIRTUAL_NODE } from './help';

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

    const vDom = this.createVDom(canApplyFormats);
    const a = this.view(vDom, this.contents);
    console.log(a);
    dom.appendChild(a);
    return dom;
  }

  private view(vDom: VirtualNode, contents: Contents) {
    const fragment = document.createDocumentFragment();

    if (vDom instanceof VirtualElementNode) {
      vDom.children.forEach(vNode => {
        const c = new Contents();
        contents.slice(vNode.formatRange.startIndex, vNode.formatRange.endIndex).forEach(item => c.add(item));
        this.view(vNode, c);
      });
    } else {
      const ff = contents.slice(vDom.formatRange.startIndex, vDom.formatRange.endIndex);
      ff.forEach(item => {
        if (typeof item === 'string') {
          let currentNode: Node;
          if (vDom.formatRange.handler) {
            currentNode = vDom.formatRange.handler.execCommand.render(vDom.formatRange.state);
            const newContents = new Contents();
            newContents.add(item);
            currentNode.appendChild(this.view(vDom, contents));

          } else {
            currentNode = document.createTextNode(item);
          }
          currentNode[VIRTUAL_NODE] = vDom;
          vDom.elementRef = currentNode;
          fragment.appendChild(currentNode);
        } else if (item instanceof ViewNode) {
          const container = item.render();
          fragment.appendChild(container);
        }
      });
    }


    return fragment;
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

  private createVDom(formatRanges: FormatRange[]) {
    const root = new VirtualElementNode(new FormatRange(0, this.contents.length, null, null, this), null);
    this.build(formatRanges,
      root,
      0,
      this.contents.length
    );
    return root;
  }

  private build(formatRanges: FormatRange[], parent: VirtualElementNode, index: number, length: number) {
    while (index < length) {
      let firstRange = formatRanges.shift();
      if (firstRange) {
        if (index < firstRange.startIndex) {
          parent.children.push(new VirtualNode(new FormatRange(index, firstRange.startIndex, null, null, this), parent));
        }
        const container = new VirtualElementNode(firstRange, parent);
        const childFormatRanges: FormatRange[] = [];
        while (true) {
          const f = formatRanges[0];
          if (f && f.endIndex < firstRange.endIndex) {
            childFormatRanges.push(formatRanges.shift());
          } else {
            break;
          }
        }
        if (childFormatRanges.length) {
          this.build(childFormatRanges, container, index, firstRange.endIndex);
        } else {
          container.children.push(new VirtualNode(new FormatRange(firstRange.startIndex, firstRange.endIndex, null, null, this), parent))
        }
        parent.children.push(container);
        index = firstRange.endIndex;
      } else {
        parent.children.push(new VirtualNode(new FormatRange(index, length, null, null, this), parent));
        break;
      }
    }
  }
}
