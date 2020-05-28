import { EventEmitter, EventType } from './events';
import { Lifecycle } from './lifecycle';
import { Renderer } from './renderer';
import { TBSelection } from './selection';
import { BlockFormatter } from './formatter';

export class VTextNode {
  constructor(public readonly textContent: string = '') {
  }
}

export class VElement {
  readonly events = new EventEmitter();
  readonly childNodes: Array<VElement | VTextNode> = [];
  readonly attrs = new Map<string, string | number>();
  readonly styles = new Map<string, string | number>();

  constructor(public tagName: string) {
  }

  appendChild(newChild: VElement | VTextNode) {
    this.childNodes.push(newChild);
    return newChild;
  }

  equal(vElement: VElement) {
    if (vElement === this) {
      return true;
    }
    if (!vElement) {
      return false;
    }
    const left = vElement;
    const right = this;
    return left.tagName == right.tagName &&
      VElement.equalMap(left.attrs, right.attrs) &&
      VElement.equalMap(left.styles, right.styles);
  }

  private static equalMap(left: Map<string, string | number>, right: Map<string, string | number>) {
    if (left === right || !left === true && !right === true) {
      return true;
    }
    if (!left !== !right || left.size !== right.size) {
      return false;
    }
    return Array.from(left.keys()).reduce((v, key) => {
      return v && left.get(key) === right.get(key);
    }, true);
  }
}

export class RootVElement extends VElement implements Lifecycle {
  constructor() {
    super('root');
    this.events.subscribe(event => {
      if (event.type === EventType.onDelete) {
        this.onDelete(event.renderer, event.selection);
      }
    })
  }

  onDelete(renderer: Renderer, selection: TBSelection): boolean {
    selection.ranges.forEach(range => {
      // 这里只用考虑闭合的选区，未闭合的选区的 default.hook 完成删除动作
      if (range.commonAncestorFragment.contentLength === 0) {
        range.deleteEmptyTree(range.commonAncestorFragment);
      } else {
        range.commonAncestorFragment.delete(range.startIndex - 1, 1);
        range.startIndex = range.endIndex = range.startIndex - 1;
      }
      // if (range.collapsed) {
      //   if (range.commonAncestorFragment.contentLength === 0) {
      //     range.deleteEmptyTree(range.commonAncestorFragment);
      //   } else {
      //     range.commonAncestorFragment.delete(range.startIndex - 1, 1);
      //     range.startIndex = range.endIndex = range.startIndex - 1;
      //   }
      //   return;
      // }
      // range.deleteSelectedScope();
      // if (range.startFragment !== range.endFragment) {
      //   const ff = range.endFragment.delete(0);
      //   ff.contents.forEach(c => range.startFragment.append(c));
      //   ff.formatRanges
      //     .filter(f => !(f.renderer instanceof BlockFormatter))
      //     .forEach(f => range.startFragment.mergeFormat(f));
      // }
      // range.collapse();
    });
    return false;
  }
}
