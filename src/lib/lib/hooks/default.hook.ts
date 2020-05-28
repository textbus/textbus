import { Lifecycle } from '../core/lifecycle';
import { Renderer } from '../core/renderer';
import { TBSelection } from '../core/selection';
import { BlockFormatter } from '../core/formatter';

export class DefaultHook implements Lifecycle {
  onInput(renderer: Renderer, selection: TBSelection) {
    if (!selection.collapsed) {
      this.deleteSelectedRange(selection);
    }
    return true;
  }

  onEnter(renderer: Renderer, selection: TBSelection) {
    if (!selection.collapsed) {
      const b = selection.ranges.map(range => {
        const flag = range.startFragment === range.endFragment;
        range.deleteSelectedScope();
        range.startFragment = range.endFragment;
        range.startIndex = range.endIndex = flag ? range.startIndex : 0;
        return flag;
      }).includes(false);
      if (b) {
        return false;
      }
    }
    return true;
  }

  onDelete(renderer: Renderer, selection: TBSelection): boolean {
    if (!selection.collapsed) {
      this.deleteSelectedRange(selection);
      return false;
    }
    return true;
  }

  private deleteSelectedRange(selection: TBSelection) {
    selection.ranges.forEach(range => {
      range.deleteSelectedScope();
      if (range.startFragment !== range.endFragment) {
        const ff = range.endFragment.delete(0);
        const startIndex = range.startFragment.contentLength;
        ff.contents.forEach(c => range.startFragment.append(c));
        ff.formatRanges
          .filter(f => !(f.renderer instanceof BlockFormatter))
          .map(f => {
            f.startIndex += startIndex;
            f.endIndex += startIndex;
            return f;
          })
          .forEach(f => range.startFragment.mergeFormat(f));
      }
      range.collapse();
    })
  }
}
