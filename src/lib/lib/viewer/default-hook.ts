import { Hook } from './help';
import { Single } from '../parser/single';
import { TBInputEvent } from './cursor';
import { Viewer } from './viewer';
import { Fragment } from '../parser/fragment';
import { Contents } from '../parser/contents';
import { Handler } from '../toolbar/handlers/help';
import { BlockFormat, FormatRange, InlineFormat } from '../parser/format';
import { Priority } from '../toolbar/help';
import { FormatState } from '../matcher/matcher';
import { defaultTagsHandler } from '../default-tags-handler';

export class DefaultHook implements Hook {
  onInput(ev: TBInputEvent, viewer: Viewer, next: () => void): void {
    const startIndex = ev.selection.firstRange.startIndex;
    const selection = viewer.selection;
    const commonAncestorFragment = selection.commonAncestorFragment;

    const c = new Contents();
    commonAncestorFragment.useContents(c);
    ev.fragment.sliceContents(0).forEach(i => {
      commonAncestorFragment.append(i);
    });
    commonAncestorFragment.useFormats(ev.fragment.getFormatMatrix());

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
    const last = commonAncestorFragment.getContentAtIndex(commonAncestorFragment.contentLength - 1);
    if (startIndex + ev.offset === commonAncestorFragment.contentLength &&
      last instanceof Single && last.tagName === 'br') {
      commonAncestorFragment.append(new Single(commonAncestorFragment, 'br'));
    }
    viewer.rerender();
    viewer.selection.apply(ev.offset);
    next();
  }

  onPaste(contents: Contents, viewer: Viewer, next: () => void): void {
    const selection = viewer.selection;
    if (!viewer.selection.collapsed) {
      viewer.deleteContents();
    }
    const firstRange = selection.firstRange;
    const newContents = contents.slice(0);
    const last = newContents[newContents.length - 1] as Fragment;

    const commonAncestorFragment = selection.commonAncestorFragment;
    const firstChild = commonAncestorFragment.getContentAtIndex(0);
    const isEmpty = commonAncestorFragment.contentLength === 0 ||
      commonAncestorFragment.contentLength === 1 && firstChild instanceof Single && firstChild.tagName === 'br';

    let index = commonAncestorFragment.getIndexInParent();
    const parent = commonAncestorFragment.parent;
    if (isEmpty) {
      parent.delete(index, index + 1);
    } else {
      let startIndex = firstRange.startIndex;
      this.onEnter(viewer, function () {
      });
      firstRange.startFragment = firstRange.endFragment = commonAncestorFragment;
      firstRange.startIndex = firstRange.endIndex = startIndex;
      const firstContent = newContents[0];
      if (firstContent instanceof Fragment) {
        if (!(firstContent.getContentAtIndex(0) instanceof Fragment)) {
          newContents.shift();
          viewer.moveContentsToFragment(firstContent, commonAncestorFragment, startIndex);
          if (!newContents.length) {
            firstRange.startIndex = firstRange.endIndex = startIndex + firstContent.contentLength;
          }
        }
      }
    }
    if (newContents.length) {
      newContents.forEach(item => {
        parent.insert(item, isEmpty ? index : index + 1);
        index++;
      });
      viewer.rerender();
      const p = viewer.findLastChild(last, last.contentLength - 1);
      firstRange.startFragment = firstRange.endFragment = p.fragment;
      firstRange.startIndex = firstRange.endIndex = p.index;
      selection.apply();
    } else {
      viewer.rerender();
      selection.apply();
    }
  }

  onEnter(viewer: Viewer, next: () => void): void {
    const selection = viewer.selection;
    selection.ranges.forEach(range => {
      const commonAncestorFragment = range.commonAncestorFragment;
      if (/th|td/i.test(commonAncestorFragment.vNode.nativeElement.nodeName)) {
        if (range.endIndex === commonAncestorFragment.contentLength) {
          commonAncestorFragment.append(new Single(commonAncestorFragment, 'br'));
        }
        commonAncestorFragment.append(new Single(commonAncestorFragment, 'br'));
        range.startIndex = range.endIndex = range.endIndex + 1;
        viewer.rerender();
        viewer.selection.apply();
      } else {
        const afterFragment = commonAncestorFragment.delete(range.startIndex,
          commonAncestorFragment.contentLength);
        if (!commonAncestorFragment.contentLength) {
          commonAncestorFragment.append(new Single(commonAncestorFragment, 'br'));
        }
        const index = commonAncestorFragment.getIndexInParent();
        const formatMatrix = new Map<Handler, Array<InlineFormat|BlockFormat>>();
        afterFragment.getFormatHandlers().filter(key => {
          return ![Priority.Default, Priority.Block].includes(key.priority);
        }).forEach(key => {
          formatMatrix.set(key, afterFragment.getFormatRangesByHandler(key));
        });
        afterFragment.useFormats(formatMatrix);
        afterFragment.mergeFormat(new BlockFormat({
          state: FormatState.Valid,
          context: afterFragment,
          handler: defaultTagsHandler,
          cacheData: {
            tag: 'p'
          }
        }));
        if (!afterFragment.contentLength) {
          afterFragment.append(new Single(afterFragment, 'br'));
        }
        commonAncestorFragment.parent.insert(afterFragment, index + 1);
        range.startFragment = range.endFragment = afterFragment;
        range.startIndex = range.endIndex = 0;
        viewer.rerender();
      }
    });
    selection.apply();
  }

  onDelete(viewer: Viewer, next: () => void): void {
    const selection = viewer.selection;
    selection.ranges.forEach(range => {
      if (range.collapsed) {
        if (range.startIndex > 0) {
          range.commonAncestorFragment.delete(range.startIndex - 1, range.startIndex);
          if (!range.commonAncestorFragment.contentLength) {
            range.commonAncestorFragment.append(new Single(range.commonAncestorFragment, 'br'));
          }
          viewer.rerender();
          selection.apply(-1);
        } else {
          const firstContent = range.startFragment.getContentAtIndex(0);
          if (firstContent instanceof Single && firstContent.tagName === 'br') {
            range.startFragment.delete(0, 1);
          }
          const rerenderFragment = viewer.findRerenderFragment(range.startFragment);
          const firstRange = selection.firstRange;
          if (range.startFragment.contentLength) {
            if (!rerenderFragment.fragment.parent && rerenderFragment.index === 0) {

              const startFragment = new Fragment(rerenderFragment.fragment);
              startFragment.mergeFormat(new BlockFormat({
                handler: defaultTagsHandler,
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
              if (rerenderFragment.fragment.contentLength) {
                const p = viewer.findFirstPosition(rerenderFragment.fragment);
                firstRange.startFragment = p.fragment;
                firstRange.startIndex = 0;
              } else {
                const startFragment = new Fragment(rerenderFragment.fragment);
                startFragment.mergeFormat(new BlockFormat({
                  handler: defaultTagsHandler,
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
          viewer.rerender();
          selection.collapse();
        }
      } else {
        let isDeletedEnd = false;
        range.getSelectedScope().forEach(s => {
          const isDelete = s.startIndex === 0 && s.endIndex === s.context.contentLength;
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
          const startLength = range.startFragment.contentLength;
          const endContents = range.endFragment.sliceContents(0);
          for (const item of endContents) {
            range.startFragment.append(item);
          }
          range.endFragment.getFormatRanges().reduce((v, n) => {
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
        if (range.startFragment.contentLength === 0) {
          range.startFragment.append(new Single(range.startFragment, 'br'));
        }
        viewer.rerender();
        selection.collapse();
      }
    });
  }
}

export const defaultHook = new DefaultHook();
