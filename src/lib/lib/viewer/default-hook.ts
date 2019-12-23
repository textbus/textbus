import { Hook } from './help';
import { Single } from '../parser/single';
import { TBInputEvent } from './cursor';
import { ViewRenderer } from './view-renderer';
import { Fragment } from '../parser/fragment';
import { Contents } from '../parser/contents';
import { Handler } from '../toolbar/handlers/help';
import { FormatRange } from '../parser/format';
import { Priority } from '../toolbar/help';
import { FormatState } from '../matcher/matcher';
import { defaultHandlers } from '../default-handlers';

export class DefaultHook implements Hook {
  onInput(ev: TBInputEvent, viewer: ViewRenderer, next: () => void): void {
    const startIndex = ev.selection.firstRange.startIndex;
    const selection = viewer.selection;
    const commonAncestorFragment = selection.commonAncestorFragment;

    commonAncestorFragment.contents = ev.fragment.contents;
    commonAncestorFragment.formatMatrix = ev.fragment.formatMatrix;

    let index = 0;
    ev.value.replace(/\n+|[^\n]+/g, (str) => {
      if (/\n+/.test(str)) {
        for (let i = 0; i < str.length; i++) {
          const s = new Single(commonAncestorFragment, 'br');
          commonAncestorFragment.insert(s, index + startIndex);
          index++;
        }
      } else {
        commonAncestorFragment.insert(str, startIndex + index);
        index += str.length;
      }
      return str;
    });

    selection.firstRange.startIndex = startIndex;
    selection.firstRange.endIndex = startIndex;
    const last = commonAncestorFragment.contents.getContentAtIndex(commonAncestorFragment.contents.length - 1);
    if (startIndex + ev.offset === commonAncestorFragment.contents.length &&
      last instanceof Single && last.tagName === 'br') {
      commonAncestorFragment.append(new Single(commonAncestorFragment, 'br'));
    }
    viewer.rerender(selection.commonAncestorFragment);
    viewer.selection.apply(ev.offset);
    next();
  }

  onPaste(contents: Contents, viewer: ViewRenderer, next: () => void): void {
    const selection = viewer.selection;
    if (!viewer.selection.collapsed) {
      viewer.deleteContents();
    }
    const firstRange = selection.firstRange;
    const newContents = contents.slice(0);
    const last = newContents[newContents.length - 1] as Fragment;

    const commonAncestorFragment = selection.commonAncestorFragment;
    const firstChild = commonAncestorFragment.contents.getContentAtIndex(0);
    const isEmpty = commonAncestorFragment.contents.length === 0 ||
      commonAncestorFragment.contents.length === 1 && firstChild instanceof Single && firstChild.tagName === 'br';

    let index = commonAncestorFragment.getIndexInParent();

    if (isEmpty) {
      commonAncestorFragment.parent.delete(index, index+1);
    } else {
      let startIndex = firstRange.startIndex;
      this.onEnter(viewer, function () {
      });
      firstRange.startFragment = firstRange.endFragment = commonAncestorFragment;
      firstRange.startIndex = firstRange.endIndex = startIndex;
      const firstContent = newContents.shift();
      if (firstContent instanceof Fragment) {
        viewer.moveContentsToFragment(firstContent, commonAncestorFragment, startIndex);
        if (!newContents.length) {
          firstRange.startIndex = firstRange.endIndex = startIndex + firstContent.contents.length;
        }
      }
    }
    if (newContents.length) {
      newContents.forEach(item => {
        commonAncestorFragment.parent.insert(item, index + 1);
        index++;
      });
      viewer.rerender(commonAncestorFragment.parent);
      const p = viewer.findLastChild(last, last.contents.length - 1);
      firstRange.startFragment = firstRange.endFragment = p.fragment;
      firstRange.startIndex = firstRange.endIndex = p.index;
      selection.apply();
    } else {
      viewer.rerender(commonAncestorFragment);
      selection.apply();
    }
  }

  onEnter(viewer: ViewRenderer, next: () => void): void {
    const selection = viewer.selection;
    selection.ranges.forEach(range => {
      const commonAncestorFragment = range.commonAncestorFragment;
      const afterFragment = commonAncestorFragment.delete(range.startIndex,
        commonAncestorFragment.contents.length);
      if (!commonAncestorFragment.contents.length) {
        commonAncestorFragment.append(new Single(commonAncestorFragment, 'br'));
      }
      const index = commonAncestorFragment.getIndexInParent();
      const formatMatrix = new Map<Handler, FormatRange[]>();
      Array.from(afterFragment.formatMatrix.keys()).filter(key => {
        return ![Priority.Default, Priority.Block].includes(key.priority);
      }).forEach(key => {
        formatMatrix.set(key, afterFragment.formatMatrix.get(key));
      });
      afterFragment.formatMatrix = formatMatrix;
      afterFragment.mergeFormat(new FormatRange({
        startIndex: 0,
        endIndex: afterFragment.contents.length,
        state: FormatState.Valid,
        context: afterFragment,
        handler: defaultHandlers,
        cacheData: {
          tag: 'p'
        }
      }));
      if (!afterFragment.contents.length) {
        afterFragment.append(new Single(afterFragment, 'br'));
      }
      commonAncestorFragment.parent.insert(afterFragment, index + 1);
      range.startFragment = range.endFragment = afterFragment;
      range.startIndex = range.endIndex = 0;
      viewer.rerender(commonAncestorFragment.parent);
    });
    selection.apply();
  }

  onDelete(viewer: ViewRenderer, next: () => void): void {
    const selection = viewer.selection;
    selection.ranges.forEach(range => {
      if (range.collapsed) {
        if (range.startIndex > 0) {
          range.commonAncestorFragment.delete(range.startIndex - 1, range.startIndex);
          if (!range.commonAncestorFragment.contents.length) {
            range.commonAncestorFragment.append(new Single(range.commonAncestorFragment, 'br'));
          }
          viewer.rerender(range.commonAncestorFragment);
          selection.apply(-1);
        } else {
          const firstContent = range.startFragment.contents.getContentAtIndex(0);
          if (firstContent instanceof Single && firstContent.tagName === 'br') {
            range.startFragment.delete(0, 1);
          }
          const rerenderFragment = viewer.findRerenderFragment(range.startFragment);
          const firstRange = selection.firstRange;
          if (range.startFragment.contents.length) {
            if (!rerenderFragment.fragment.parent && rerenderFragment.index === 0) {

              const startFragment = new Fragment(rerenderFragment.fragment);
              startFragment.mergeFormat(new FormatRange({
                startIndex: 0,
                endIndex: 0,
                handler: defaultHandlers,
                state: FormatState.Valid,
                context: startFragment,
                cacheData: {
                  tag: 'p'
                }
              }), true);
              rerenderFragment.fragment.insert(startFragment, 0);
              viewer.moveContentsToFragment(range.startFragment, startFragment, 0);
              viewer.deleteEmptyFragment(range.startFragment);
              firstRange.startFragment = startFragment;
              firstRange.startIndex = 0;
            } else {
              const p = viewer.findLastChild(rerenderFragment.fragment, rerenderFragment.index - 1);
              viewer.moveContentsToFragment(range.startFragment, p.fragment, p.index);
              viewer.deleteEmptyFragment(range.startFragment);
              firstRange.startFragment = p.fragment;
              firstRange.startIndex = p.index;
            }
          } else {
            if (rerenderFragment.index === 0) {
              viewer.deleteEmptyFragment(range.startFragment);
              if (rerenderFragment.fragment.contents.length) {
                const p = viewer.findFirstPosition(rerenderFragment.fragment);
                firstRange.startFragment = p.fragment;
                firstRange.startIndex = 0;
              } else {
                const startFragment = new Fragment(rerenderFragment.fragment);
                startFragment.mergeFormat(new FormatRange({
                  startIndex: 0,
                  endIndex: 0,
                  handler: defaultHandlers,
                  state: FormatState.Valid,
                  context: startFragment,
                  cacheData: {
                    tag: 'p'
                  }
                }), true);
                startFragment.append(new Single(startFragment, 'br'));
                rerenderFragment.fragment.insert(startFragment, 0);
                firstRange.startFragment = startFragment;
                firstRange.startIndex = 0;
              }
            } else {
              const p = viewer.findLastChild(rerenderFragment.fragment, rerenderFragment.index - 1);
              viewer.deleteEmptyFragment(range.startFragment);
              firstRange.startFragment = p.fragment;
              firstRange.startIndex = p.index;
            }
          }
          viewer.rerender(rerenderFragment.fragment);
          selection.collapse();
        }
      } else {
        let isDeletedEnd = false;
        range.getSelectedScope().forEach(s => {
          const isDelete = s.startIndex === 0 && s.endIndex === s.context.contents.length;
          if (isDelete && s.context !== range.startFragment) {
            if (s.context === range.endFragment) {
              isDeletedEnd = true;
            }
            viewer.deleteEmptyFragment(s.context);
          } else {
            s.context.delete(s.startIndex, s.endIndex);
          }
        });
        if (range.endFragment !== range.startFragment && !isDeletedEnd) {
          const startLength = range.startFragment.contents.length;
          const endContents = range.endFragment.contents;
          const endFormats = range.endFragment.formatMatrix;
          for (const item of endContents) {
            range.startFragment.append(item);
          }
          Array.from(endFormats.values()).reduce((v, n) => {
            return v.concat(n);
          }, []).forEach(f => {
            if ([Priority.Inline, Priority.Property].includes(f.handler.priority)) {
              const ff = f.clone();
              ff.startIndex += startLength;
              ff.endIndex += startLength;
              range.startFragment.mergeFormat(ff, true);
            }
          });
          viewer.deleteEmptyFragment(range.endFragment);

        }
        range.endFragment = range.startFragment;
        range.endIndex = range.startIndex;
        if (range.startFragment.contents.length === 0) {
          range.startFragment.append(new Single(range.startFragment, 'br'));
        }
        viewer.rerender(range.commonAncestorFragment);
        selection.collapse();
      }
    });
  }
}

export const defaultHook = new DefaultHook();
