import { Lifecycle, Clipboard, TBSelection } from '../core/_api';

export class DefaultHook implements Lifecycle {
  onInput(selection: TBSelection) {
    selection.ranges.forEach(range => {
      range.connect();
    })
    return selection.collapsed && selection.rangeCount === 1;
  }

  onPaste(contents: Clipboard, selection: TBSelection): boolean {
    selection.ranges.forEach(range => {
      range.connect();
    });
    return true;
  }

  onEnter(selection: TBSelection) {
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

  onDelete(selection: TBSelection): boolean {
    if (!selection.collapsed) {
      selection.ranges.forEach(range => {
        range.connect();
      })
      return false;
    }
    return true;
  }
}
