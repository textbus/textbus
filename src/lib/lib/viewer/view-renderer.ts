import { fromEvent, merge, Observable, Subject } from 'rxjs';

import { template } from './template-html';
import { TBSelection } from './selection';
import { Hook, Priority } from '../toolbar/help';
import { RootFragment } from '../parser/root-fragment';
import { Handler } from '../toolbar/handlers/help';
import { FormatState, Matcher, MatchState } from '../matcher/matcher';
import { Cursor, CursorMoveDirection, CursorMoveType, InputEvent } from './cursor';
import { TBRange, TBRangePosition } from './range';
import { Fragment } from '../parser/fragment';
import { FormatRange } from '../parser/format';
import { defaultHandlersMap, DefaultTagCommander, DefaultTagsHandler } from '../default-handlers';
import { Single } from '../parser/single';
import { Parser } from '../parser/parser';

export class ViewRenderer {
  elementRef = document.createElement('div');
  onSelectionChange: Observable<TBSelection>;
  onUserWrite: Observable<void>;
  onReady: Observable<Document>;

  contentWindow: Window;
  contentDocument: Document;
  nativeSelection: Selection;

  private userWriteEvent = new Subject<void>();
  private selectionChangeEvent = new Subject<TBSelection>();
  private readyEvent = new Subject<Document>();

  private frame = document.createElement('iframe');
  private selection = new TBSelection();
  private hooks: Hook[] = [];

  private cursor: Cursor;

  constructor(private parser: Parser) {
    this.onUserWrite = this.userWriteEvent.asObservable();
    this.onSelectionChange = this.selectionChangeEvent.asObservable();
    this.onReady = this.readyEvent.asObservable();

    this.frame.onload = () => {
      const doc = this.frame.contentDocument;
      this.contentDocument = doc;
      this.contentWindow = this.frame.contentWindow;
      this.cursor = new Cursor(doc);

      merge(...['selectstart', 'mousedown'].map(type => fromEvent(this.contentDocument, type)))
        .subscribe(() => {
          this.nativeSelection = this.contentDocument.getSelection();
          this.nativeSelection.removeAllRanges();
        });

      fromEvent(this.contentDocument, 'selectionchange').subscribe(() => {
        const tbSelection = new TBSelection();
        const ranges: Range[] = [];
        if (this.nativeSelection.rangeCount) {
          for (let i = 0; i < this.nativeSelection.rangeCount; i++) {
            ranges.push(this.nativeSelection.getRangeAt(i));
          }
        }
        ranges.forEach(range => {
          this.hooks.filter(hook => typeof hook.onSelectionChange === 'function').forEach(hook => {
            const r = hook.onSelectionChange(range, this.contentDocument);
            if (Array.isArray(r)) {
              r.forEach(rr => {
                tbSelection.addRange(new TBRange(rr));
              })
            } else {
              tbSelection.addRange(new TBRange(r));
            }
          })
        });
        this.selection = tbSelection;
        this.cursor.updateStateBySelection(tbSelection);
        this.selectionChangeEvent.next(tbSelection);
      });

      this.readyEvent.next(doc);
      this.elementRef.appendChild(this.cursor.elementRef);

      this.cursor.onInput.subscribe(v => {
        if (this.selection.collapsed) {
          this.updateContents(v);
        }
      });
      this.cursor.onDelete.subscribe(() => {
        this.deleteContents();
      });
      this.cursor.onNewLine.subscribe(() => {
        if (!this.selection.collapsed) {
          this.deleteContents();
        }
        this.createNewLine();
      });
      this.cursor.onMove.subscribe(direction => {
        this.moveCursor(direction);
      });
      this.cursor.onSelectAll.subscribe(() => {
        this.selectAll();
      });
      this.cursor.onPaste.subscribe(el => {
        this.paste(el);
      });
    };
    this.frame.setAttribute('scrolling', 'no');
    this.frame.src = `javascript:void((function () {
                      document.open();
                      document.domain = '${document.domain}';
                      document.write('${template}');
                      document.close();
                    })())`;


    this.elementRef.classList.add('tanbo-editor-wrap');
    this.frame.classList.add('tanbo-editor-frame');
    this.elementRef.appendChild(this.frame);
  }

  render(rootFragment: RootFragment) {
    this.contentDocument.body.innerHTML = '';
    rootFragment.render(this.contentDocument.body);
    this.updateFrameHeight();
  }

  use(hook: Hook) {
    this.hooks.push(hook);
    if (typeof hook.setup === 'function') {
      hook.setup(this.elementRef, {
        document: this.contentDocument,
        window: this.contentWindow
      });
    }
  }

  cloneSelection() {
    return this.selection.clone();
  }

  apply(handler: Handler) {
    const state = handler.matcher.queryState(this.selection, handler).state;
    if (state === MatchState.Disabled) {
      return;
    }
    const overlap = state === MatchState.Highlight;
    if (handler.hook && typeof handler.hook.onApply === 'function') {
      handler.hook.onApply(handler.execCommand);
    }
    let selection = this.selection;
    handler.execCommand.command(selection, handler, overlap);
    this.rerender(selection.commonAncestorFragment);
    selection.apply();
    this.viewChanged();
    this.selectionChangeEvent.next(this.selection);
  }

  private paste(el: HTMLElement) {
    if (!this.selection.collapsed) {
      this.deleteContents();
    }
    const firstRange = this.selection.firstRange;
    const fragment = this.parser.parse(el, new Fragment(null));
    const newContents = fragment.contents.slice(0);
    const last = newContents[newContents.length - 1] as Fragment;

    const commonAncestorFragment = this.selection.commonAncestorFragment;
    const firstChild = commonAncestorFragment.contents.getContentAtIndex(0);
    const isEmpty = commonAncestorFragment.contents.length === 0 ||
      commonAncestorFragment.contents.length === 1 && firstChild instanceof Single && firstChild.tagName === 'br';

    let index = commonAncestorFragment.getIndexInParent();

    if (isEmpty) {
      commonAncestorFragment.parent.delete(index, 1);
    } else {
      let startIndex = firstRange.startIndex;
      this.createNewLine();
      firstRange.startFragment = firstRange.endFragment = commonAncestorFragment;
      firstRange.startIndex = firstRange.endIndex = startIndex;
      const firstContent = newContents.shift();
      if (firstContent instanceof Fragment) {
        this.moveContentsToFragment(firstContent, commonAncestorFragment, startIndex);
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
      this.rerender(commonAncestorFragment.parent);
      const p = this.findLastChild(last, last.contents.length - 1);
      firstRange.startFragment = firstRange.endFragment = p.fragment;
      firstRange.startIndex = firstRange.endIndex = p.index;
      this.selection.apply();
    } else {
      this.rerender(commonAncestorFragment);
      this.selection.apply();
    }

    this.viewChanged();
  }

  private selectAll() {
    const firstRange = this.selection.firstRange;
    this.selection.removeAllRanges();
    let f = firstRange.startFragment;
    while (f.parent) {
      f = f.parent;
    }

    const startPosition = this.findFirstChild(f);
    const endPosition = this.findLastChild(f, f.contents.length - 1);

    firstRange.startFragment = startPosition.fragment;
    firstRange.endFragment = endPosition.fragment;
    firstRange.startIndex = 0;
    firstRange.endIndex = endPosition.index;
    this.selection.addRange(firstRange);
    this.selection.apply();
  }

  private moveCursor(direction: CursorMoveDirection) {
    this.selection.ranges.forEach(range => {
      let p: TBRangePosition;
      switch (direction.type) {
        case CursorMoveType.Left:
          p = ViewRenderer.getPreviousPosition(range);
          range.startFragment = p.fragment;
          range.startIndex = p.index;
          range.endFragment = p.fragment;
          range.endIndex = p.index;
          // if (!direction.ctrlKey) {
          //
          // }
          break;
        case CursorMoveType.Right:
          p = ViewRenderer.getNextPosition(range);
          range.startFragment = p.fragment;
          range.startIndex = p.index;
          range.endFragment = p.fragment;
          range.endIndex = p.index;
          // if (!direction.ctrlKey) {
          //
          // }
          break;
      }
    });
    this.selection.apply();
  }

  private createNewLine() {
    const selection = this.selection;
    selection.ranges.forEach(range => {
      const commonAncestorFragment = range.commonAncestorFragment;
      const afterFragment = commonAncestorFragment.delete(range.startIndex,
        commonAncestorFragment.contents.length - range.startIndex);
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
        handler: new DefaultTagsHandler(new DefaultTagCommander('p'), null),
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
      this.rerender(commonAncestorFragment.parent);
    });
    this.selection.apply();
    this.viewChanged();
  }

  private deleteContents() {
    this.selection.ranges.forEach(range => {
      if (range.collapsed) {
        if (range.startIndex > 0) {
          range.commonAncestorFragment.delete(range.startIndex - 1, 1);
          if (!range.commonAncestorFragment.contents.length) {
            range.commonAncestorFragment.append(new Single(range.commonAncestorFragment, 'br'));
          }
          this.rerender(range.commonAncestorFragment);
          this.selection.apply(-1);
        } else {
          const firstContent = range.startFragment.contents.getContentAtIndex(0);
          if (firstContent instanceof Single && firstContent.tagName === 'br') {
            range.startFragment.delete(0, 1);
          }
          const rerenderFragment = this.findRerenderFragment(range.startFragment);
          const firstRange = this.selection.firstRange;
          if (range.startFragment.contents.length) {
            if (!rerenderFragment.fragment.parent && rerenderFragment.index === 0) {

              const startFragment = new Fragment(rerenderFragment.fragment);
              startFragment.mergeFormat(new FormatRange({
                startIndex: 0,
                endIndex: 0,
                handler: defaultHandlersMap.get('p'),
                state: FormatState.Valid,
                context: startFragment,
                cacheData: {
                  tag: 'p'
                }
              }), true);
              rerenderFragment.fragment.insert(startFragment, 0);
              this.moveContentsToFragment(range.startFragment, startFragment, 0);
              this.deleteEmptyFragment(range.startFragment);
              firstRange.startFragment = startFragment;
              firstRange.startIndex = 0;
            } else {
              const p = this.findLastChild(rerenderFragment.fragment, rerenderFragment.index - 1);
              this.moveContentsToFragment(range.startFragment, p.fragment, p.index);
              this.deleteEmptyFragment(range.startFragment);
              firstRange.startFragment = p.fragment;
              firstRange.startIndex = p.index;
            }
          } else {
            if (rerenderFragment.index === 0) {
              this.deleteEmptyFragment(range.startFragment);
              if (rerenderFragment.fragment.contents.length) {
                const p = this.findFirstChild(rerenderFragment.fragment);
                firstRange.startFragment = p.fragment;
                firstRange.startIndex = 0;
              } else {
                const startFragment = new Fragment(rerenderFragment.fragment);
                startFragment.mergeFormat(new FormatRange({
                  startIndex: 0,
                  endIndex: 0,
                  handler: defaultHandlersMap.get('p'),
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
              const p = this.findLastChild(rerenderFragment.fragment, rerenderFragment.index - 1);
              this.deleteEmptyFragment(range.startFragment);
              firstRange.startFragment = p.fragment;
              firstRange.startIndex = p.index;
            }
          }
          this.rerender(rerenderFragment.fragment);
          this.selection.collapse();
        }
      } else {
        let isDeletedEnd = false;
        range.getSelectedScope().forEach(s => {
          const isDelete = s.startIndex === 0 && s.endIndex === s.context.contents.length;
          if (isDelete && s.context !== range.startFragment) {
            if (s.context === range.endFragment) {
              isDeletedEnd = true;
            }
            this.deleteEmptyFragment(s.context);
          } else {
            s.context.delete(s.startIndex, s.endIndex - s.startIndex);
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
          this.deleteEmptyFragment(range.endFragment);

        }
        range.endFragment = range.startFragment;
        range.endIndex = range.startIndex;
        if (range.startFragment.contents.length === 0) {
          range.startFragment.append(new Single(range.startFragment, 'br'));
        }
        this.rerender(range.commonAncestorFragment);
        this.selection.collapse();
      }
    });

    this.viewChanged();
  }

  private deleteEmptyFragment(fragment: Fragment) {
    const parent = fragment.parent;
    fragment.destroy();
    if (parent && !parent.contents.length) {
      this.deleteEmptyFragment(parent);
    }
  }

  private moveContentsToFragment(oldFragment: Fragment, target: Fragment, startIndex: number) {
    for (const item of oldFragment.contents) {
      target.append(item);
    }
    Array.from(oldFragment.formatMatrix.values()).reduce((v, n) => {
      return v.concat(n);
    }, []).forEach(f => {
      if ([Priority.Inline, Priority.Property].includes(f.handler.priority)) {
        const ff = f.clone();
        ff.startIndex += startIndex;
        ff.endIndex += startIndex;
        target.mergeFormat(ff, true);
      }
    });
  }

  private findRerenderFragment(start: Fragment): TBRangePosition {
    if (!start.parent) {
      return {
        fragment: start,
        index: 0
      }
    }
    const index = start.getIndexInParent();
    if (index === 0) {
      return this.findRerenderFragment(start.parent);
    }
    return {
      index,
      fragment: start.parent
    };
  }

  private findLastChild(fragment: Fragment, index: number): TBRangePosition {
    const last = fragment.contents.getContentAtIndex(index);
    if (last instanceof Fragment) {
      return this.findLastChild(last, last.contents.length - 1);
    } else if (last instanceof Single && last.tagName === 'br') {
      return {
        index: fragment.contents.length - 1,
        fragment
      };
    }
    return {
      index: fragment.contents.length,
      fragment
    }
  }

  private findFirstChild(fragment: Fragment): TBRangePosition {
    const first = fragment.contents.getContentAtIndex(0);
    if (first instanceof Fragment) {
      return this.findFirstChild(first);
    }
    return {
      index: 0,
      fragment
    };
  }

  private updateContents(ev: InputEvent) {
    const startIndex = ev.selection.firstRange.startIndex;
    const commonAncestorFragment = this.selection.commonAncestorFragment;

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

    this.selection.firstRange.startIndex = startIndex;
    this.selection.firstRange.endIndex = startIndex;
    const last = commonAncestorFragment.contents.getContentAtIndex(commonAncestorFragment.contents.length - 1);
    if (startIndex + ev.offset === commonAncestorFragment.contents.length &&
      last instanceof Single && last.tagName === 'br') {
      commonAncestorFragment.append(new Single(commonAncestorFragment, 'br'));
    }
    this.rerender(commonAncestorFragment);
    this.selection.apply(ev.offset);
    this.userWriteEvent.next();

    this.viewChanged();
  }

  private rerender(fragment: Fragment) {
    const position = fragment.destroyView();
    fragment.render(position.host, position.nextSibling);
    this.updateFrameHeight();
  }

  private updateFrameHeight() {
    this.frame.style.height = this.contentDocument.documentElement.scrollHeight + 'px';
  }

  private viewChanged() {
    this.hooks.forEach(hook => {
      if (typeof hook.onViewChange === 'function') {
        hook.onViewChange();
      }
    });
  }

  private static getPreviousPosition(range: TBRange) {
    const currentFragment = range.startFragment;
    let offset = range.startIndex;

    if (offset > 0) {
      return {
        fragment: currentFragment,
        index: offset - 1
      }
    }

    let fragment = currentFragment;
    while (fragment.parent) {
      const index = fragment.getIndexInParent();
      if (index === 0) {
        fragment = fragment.parent;
      } else {
        let prev = fragment.parent.contents.getContentAtIndex(index - 1);
        if (prev instanceof Fragment) {
          while (prev) {
            const last = (prev as Fragment).contents.getContentAtIndex((prev as Fragment).contents.length - 1);
            if (last instanceof Fragment) {
              prev = last;
            } else {
              let len = (prev as Fragment).contents.length;
              const c = (prev as Fragment).contents.getContentAtIndex(len - 1);
              if (c instanceof Single && c.tagName === 'br') {
                len--;
              }
              return {
                fragment: prev as Fragment,
                index: len
              }
            }
          }

        } else {
          return {
            fragment: fragment.parent,
            index: index - 1
          }
        }
      }
    }
    return {
      fragment: currentFragment,
      index: 0
    }
  }

  private static getNextPosition(range: TBRange): TBRangePosition {
    const currentFragment = range.endFragment;
    let offset = range.endIndex;
    if (offset === currentFragment.contents.length - 1) {
      const c = currentFragment.contents.getContentAtIndex(offset);
      if (c instanceof Single && c.tagName === 'br') {
        offset++;
      }
    }

    if (offset < currentFragment.contents.length) {
      return {
        fragment: currentFragment,
        index: offset + 1
      }
    }
    let fragment = currentFragment;
    while (fragment.parent) {
      const index = fragment.getIndexInParent();
      if (index === fragment.parent.contents.length - 1) {
        fragment = fragment.parent;
      } else {
        let next = fragment.parent.contents.getContentAtIndex(index + 1);
        if (next instanceof Fragment) {
          while (next) {
            const first = (next as Fragment).contents.getContentAtIndex(0);
            if (first instanceof Fragment) {
              next = first;
            } else {
              return {
                fragment: next as Fragment,
                index: 0
              }
            }
          }

        } else {
          return {
            fragment: fragment.parent,
            index: index + 1
          }
        }
      }
    }
    let index = currentFragment.contents.length;
    const c = currentFragment.contents.getContentAtIndex(index - 1);
    if (c instanceof Single && c.tagName === 'br') {
      index--;
    }
    return {
      fragment: currentFragment,
      index
    }
  }

}
