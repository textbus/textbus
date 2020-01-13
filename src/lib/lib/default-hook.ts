import { Hook } from './viewer/help';
import { Single } from './parser/single';
import { TBInputEvent, Viewer } from './viewer/viewer';
import { Fragment } from './parser/fragment';
import { Contents } from './parser/contents';
import { BlockFormat } from './parser/format';
import { Priority } from './toolbar/help';
import { Parser } from './parser/parser';
import { AbstractData } from './toolbar/utils/abstract-data';

export class DefaultHook implements Hook {
  onInput(ev: TBInputEvent, viewer: Viewer, parser: Parser, next: () => void): void {
    const startIndex = ev.selection.firstRange.startIndex;
    const selection = viewer.selection;
    const commonAncestorFragment = selection.commonAncestorFragment;

    const c = new Contents();
    commonAncestorFragment.useContents(c);
    ev.fragment.clone().sliceContents(0).forEach(i => {
      commonAncestorFragment.append(i);
    });
    commonAncestorFragment.useFormats(ev.fragment.getFormatMatrix());

    let index = 0;
    ev.value.replace(/\n+|[^\n]+/g, (str) => {
      if (/\n+/.test(str)) {
        for (let i = 0; i < str.length; i++) {
          const s = new Single('br', parser.getFormatStateByData(new AbstractData({
            tag: 'br'
          })));
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
      commonAncestorFragment.append(new Single('br', parser.getFormatStateByData(new AbstractData({
        tag: 'br'
      }))));
    }
    viewer.rerender();
    viewer.selection.apply(ev.offset);
    next();
  }

  onPaste(contents: Contents, viewer: Viewer, parser: Parser, next: () => void): void {
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
      this.onEnter(viewer, parser, function () {
      });
      firstRange.startFragment = firstRange.endFragment = commonAncestorFragment;
      firstRange.startIndex = firstRange.endIndex = startIndex;
      const firstContent = newContents[0];
      if (firstContent instanceof Fragment) {
        if (!(firstContent.getContentAtIndex(0) instanceof Fragment)) {
          newContents.shift();
          commonAncestorFragment.insertFragmentContents(firstContent, startIndex);
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

  onEnter(viewer: Viewer, parser: Parser, next: () => void): void {
    const selection = viewer.selection;
    selection.ranges.forEach(range => {
      const commonAncestorFragment = range.commonAncestorFragment;
      if (/th|td/i.test(commonAncestorFragment.token.elementRef.name)) {
        if (range.endIndex === commonAncestorFragment.contentLength) {
          commonAncestorFragment.append(new Single('br', parser.getFormatStateByData(new AbstractData({
            tag: 'br'
          }))));
        }
        commonAncestorFragment.append(new Single('br', parser.getFormatStateByData(new AbstractData({
          tag: 'br'
        }))));
        range.startIndex = range.endIndex = range.endIndex + 1;
        viewer.rerender();
        viewer.selection.apply();
      } else {
        const afterFragment = commonAncestorFragment.delete(range.startIndex,
          commonAncestorFragment.contentLength);
        if (!commonAncestorFragment.contentLength) {
          commonAncestorFragment.append(new Single('br', parser.getFormatStateByData(new AbstractData({
            tag: 'br'
          }))));
        }
        const index = commonAncestorFragment.getIndexInParent();
        parser.getFormatStateByData(new AbstractData({
          tag: 'p'
        })).forEach(item => {
          afterFragment.mergeFormat(new BlockFormat({
            ...item,
            context: afterFragment
          }))
        });
        if (!afterFragment.contentLength) {
          afterFragment.append(new Single('br', parser.getFormatStateByData(new AbstractData({
            tag: 'br'
          }))));
        }
        commonAncestorFragment.parent.insert(afterFragment, index + 1);
        range.startFragment = range.endFragment = afterFragment;
        range.startIndex = range.endIndex = 0;
        viewer.rerender();
      }
    });
    selection.apply();
  }

  onDelete(viewer: Viewer, parser: Parser, next: () => void): void {
    const selection = viewer.selection;
    selection.ranges.forEach(range => {
      if (range.collapsed) {
        if (range.startIndex > 0) {
          range.commonAncestorFragment.delete(range.startIndex - 1, range.startIndex);
          if (!range.commonAncestorFragment.contentLength) {
            range.commonAncestorFragment.append(new Single('br', parser.getFormatStateByData(new AbstractData({
              tag: 'br'
            }))));
          }
          viewer.rerender();
          selection.apply(-1);
        } else {
          const firstContent = range.startFragment.getContentAtIndex(0);
          if (firstContent instanceof Single && firstContent.tagName === 'br') {
            range.startFragment.delete(0, 1);
          }
          const rerenderFragment = viewer.findRerenderFragment(range.startFragment);
          if (range.startFragment.contentLength) {
            if (!rerenderFragment.fragment.parent && rerenderFragment.index === 0) {
              const startFragment = new Fragment();
              parser.getFormatStateByData(new AbstractData({
                tag: 'p'
              })).forEach(item => {
                startFragment.mergeFormat(new BlockFormat({
                  ...item,
                  context: startFragment
                }), true)
              });

              rerenderFragment.fragment.insert(startFragment, 0);
              startFragment.insertFragmentContents(range.startFragment, 0);
              range.startFragment.cleanEmptyFragmentTreeBySelf();
              range.startFragment = startFragment;
              range.startIndex = 0;
            } else {
              const p = viewer.findLastChild(rerenderFragment.fragment, rerenderFragment.index - 1);
              p.fragment.insertFragmentContents(range.startFragment, p.index);
              range.startFragment.cleanEmptyFragmentTreeBySelf();
              range.startFragment = p.fragment;
              range.startIndex = p.index;
            }
          } else {
            if (rerenderFragment.index === 0) {
              range.startFragment.cleanEmptyFragmentTreeBySelf();
              if (rerenderFragment.fragment.contentLength) {
                const p = viewer.findFirstPosition(rerenderFragment.fragment);
                range.startFragment = p.fragment;
                range.startIndex = 0;
              } else {
                const startFragment = new Fragment();
                parser.getFormatStateByData(new AbstractData({
                  tag: 'p'
                })).forEach(item => {
                  startFragment.mergeFormat(new BlockFormat({
                    ...item,
                    context: startFragment
                  }))
                });

                startFragment.append(new Single('br', parser.getFormatStateByData(new AbstractData({
                  tag: 'br'
                }))));
                rerenderFragment.fragment.insert(startFragment, 0);
                range.startFragment = startFragment;
                range.startIndex = 0;
              }
            } else {
              const p = viewer.findLastChild(rerenderFragment.fragment, rerenderFragment.index - 1);
              range.startFragment.cleanEmptyFragmentTreeBySelf();
              range.startFragment = p.fragment;
              range.startIndex = p.index;
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
            s.context.cleanEmptyFragmentTreeBySelf();
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
          range.endFragment.cleanEmptyFragmentTreeBySelf();
        }
        range.endFragment = range.startFragment;
        range.endIndex = range.startIndex;
        if (range.startFragment.contentLength === 0) {
          range.startFragment.append(new Single('br', parser.getFormatStateByData(new AbstractData({
            tag: 'br'
          }))));
        }
        viewer.rerender();
        selection.collapse();
      }
    });
  }
}
