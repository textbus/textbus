import { EventEmitter, EventType } from './events';
import { Lifecycle } from './lifecycle';
import { Renderer } from './renderer';
import { TBSelection } from './selection';
import { MediaTemplate } from './template';

export class VTextNode {
  constructor(public readonly textContent: string = '') {
  }
}

export class VElement {
  readonly events = new EventEmitter();
  readonly childNodes: Array<VElement | VTextNode> = [];
  readonly attrs = new Map<string, string | number | boolean>();
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

  private static equalMap(left: Map<string, string | number | boolean>, right: Map<string, string | number | boolean>) {
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
      if (!range.collapsed) {
        range.connect();
        return;
      }
      if (range.startIndex > 0) {
        if (range.commonAncestorFragment.contentLength === 0) {
          range.deleteEmptyTree(range.commonAncestorFragment);
        } else {
          range.commonAncestorFragment.delete(range.startIndex - 1, 1);
          range.startIndex = range.endIndex = range.startIndex - 1;
        }
      } else {
        const firstContent = range.startFragment.getContentAtIndex(0);
        if (firstContent instanceof MediaTemplate && firstContent.tagName === 'br') {
          range.startFragment.delete(0, 1);
          if (range.startFragment.contentLength === 0) {
            let position = range.getPreviousPosition();
            if (position.fragment === range.startFragment && position.index === range.startIndex) {
              position = range.getNextPosition();
            }
            range.deleteEmptyTree(range.startFragment);
            range.setStart(position.fragment, position.index);
            range.collapse();
          }
        } else {
          const prevPosition = range.getPreviousPosition();
          if (prevPosition.fragment !== range.startFragment) {
            range.setStart(prevPosition.fragment, prevPosition.index);
            const last = prevPosition.fragment.getContentAtIndex(prevPosition.index - 1);
            if (last instanceof MediaTemplate && last.tagName === 'br') {
              range.startIndex--;
            }
            range.connect();
          }
        }
      }
    });
    return false;
  }
}
