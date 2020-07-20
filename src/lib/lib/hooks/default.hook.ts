import { Contents, Lifecycle, Renderer, TBSelection } from '../core/_api';

export class DefaultHook implements Lifecycle {
  onInput(renderer: Renderer, selection: TBSelection) {
    selection.ranges.forEach(range => {
      range.connect();
    })
    return selection.collapsed && selection.rangeCount === 1;
  }

  onPaste(contents: Contents, renderer: Renderer, selection: TBSelection): boolean {
    selection.ranges.forEach(range => {
      range.connect();
    });
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
      selection.ranges.forEach(range => {
        range.connect();
      })
      return false;
    }
    return true;
  }
}
