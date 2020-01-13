import { fromEvent, merge, Observable, Subject } from 'rxjs';

import { template } from './template-html';
import { TBSelection } from './selection';
import { RootFragment } from '../parser/root-fragment';
import { Handler } from '../toolbar/handlers/help';
import { MatchState } from '../matcher/matcher';
import { Cursor, CursorMoveDirection, CursorMoveType, TBInputEvent } from './cursor';
import { TBRange, TBRangePosition } from './range';
import { Fragment } from '../parser/fragment';
import { Single } from '../parser/single';
import { Hook } from './help';
import { Contents } from '../parser/contents';
import { Editor } from '../editor';
import { Differ } from '../renderer/differ';
import { DOMElement } from '../renderer/dom-renderer';

export class Viewer {
  elementRef = document.createElement('div');
  onSelectionChange: Observable<TBSelection>;
  onUserWrite: Observable<void>;
  onReady: Observable<Document>;

  contentWindow: Window;
  contentDocument: Document;
  nativeSelection: Selection;

  selection: TBSelection;

  private userWriteEvent = new Subject<void>();
  private selectionChangeEvent = new Subject<TBSelection>();
  private readyEvent = new Subject<Document>();

  private frame = document.createElement('iframe');
  private hooks: Hook[] = [];
  private root: RootFragment;

  private cursor: Cursor;

  constructor(private editor: Editor,
              private renderer: Differ) {
    this.onUserWrite = this.userWriteEvent.asObservable();
    this.onSelectionChange = this.selectionChangeEvent.asObservable();
    this.onReady = this.readyEvent.asObservable();

    this.frame.onload = () => {
      const doc = this.frame.contentDocument;
      this.contentDocument = doc;
      this.contentWindow = this.frame.contentWindow;
      this.selection = new TBSelection(doc);
      this.cursor = new Cursor(doc);
      this.readyEvent.next(doc);
      this.elementRef.appendChild(this.cursor.elementRef);

      merge(...['selectstart', 'mousedown'].map(type => fromEvent(this.contentDocument, type)))
        .subscribe(() => {
          this.nativeSelection = this.contentDocument.getSelection();
          this.nativeSelection.removeAllRanges();
        });

      let selectionChangedTimer: number;

      fromEvent(this.contentDocument, 'selectionchange').subscribe(() => {
        clearTimeout(selectionChangedTimer);
        const tbSelection = new TBSelection(doc);
        const ranges: Range[] = [];
        if (this.nativeSelection.rangeCount) {
          for (let i = 0; i < this.nativeSelection.rangeCount; i++) {
            ranges.push(this.nativeSelection.getRangeAt(i));
          }
        }
        ranges.forEach(range => {
          const hooks = this.hooks.filter(hook => typeof hook.onSelectionChange === 'function');
          if (hooks.length) {
            hooks.forEach(hook => {
              const r = hook.onSelectionChange(range, this.contentDocument);
              if (Array.isArray(r)) {
                r.forEach(rr => {
                  tbSelection.addRange(new TBRange(rr));
                })
              } else {
                tbSelection.addRange(new TBRange(r));
              }
            })
          } else {
            tbSelection.addRange(new TBRange(range));
          }
        });
        this.selection = tbSelection;
        this.cursor.updateStateBySelection(tbSelection);
        this.selectionChangeEvent.next(tbSelection);
      });

      this.cursor.onInput.subscribe(v => {
        this.updateContents(v);
        this.cursor.updateStateBySelection(this.selection);
      });
      this.cursor.onDelete.subscribe(() => {
        this.deleteContents();
        this.cursor.updateStateBySelection(this.selection);
        selectionChangedTimer = setTimeout(() => {
          // 当全部删除后，再次删除，不会触发 selection 变化，会导致 toolbar 状态高亮异常，这里手动触发一次
          this.selectionChangeEvent.next(this.selection);
        });
      });
      this.cursor.onNewLine.subscribe(() => {
        if (!this.selection.collapsed) {
          this.deleteContents();
        }
        this.createNewLine();
        this.cursor.updateStateBySelection(this.selection);
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
    this.root = rootFragment;
    this.contentDocument.body.innerHTML = '';
    this.renderer.render(rootFragment.createVDom(), new DOMElement(this.contentDocument.body));
    this.updateFrameHeight();
  }

  use(hook: Hook) {
    this.hooks.push(hook);
    if (typeof hook.setup === 'function') {
      hook.setup(this.elementRef, {
        document: this.contentDocument,
        window: this.contentWindow,
        editor: this.editor
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
    handler.execCommand.command(selection, handler, overlap, this.root);
    this.rerender();
    selection.apply();
    this.viewChanged();
    this.selectionChangeEvent.next(this.selection);
  }

  rerender() {
    this.renderer.render(this.root.createVDom(), new DOMElement(this.contentDocument.body));
    this.updateFrameHeight();
  }


  deleteContents() {
    const hooks = this.hooks.filter(hook => typeof hook.onDelete === 'function');
    for (const hook of hooks) {
      let isLoop = false;
      hook.onDelete(this, this.root.parser, () => {
        isLoop = true;
      });
      if (!isLoop) {
        break;
      }
    }

    this.viewChanged();
  }

  findLastChild(fragment: Fragment, index: number): TBRangePosition {
    const last = fragment.getContentAtIndex(index);
    if (last instanceof Fragment) {
      return this.findLastChild(last, last.contentLength - 1);
    } else if (last instanceof Single && last.tagName === 'br') {
      return {
        index: fragment.contentLength - 1,
        fragment
      };
    }
    return {
      index: fragment.contentLength,
      fragment
    }
  }

  findRerenderFragment(start: Fragment): TBRangePosition {
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

  findFirstPosition(fragment: Fragment): TBRangePosition {
    const first = fragment.getContentAtIndex(0);
    if (first instanceof Fragment) {
      return this.findFirstPosition(first);
    }
    return {
      index: 0,
      fragment
    };
  }


  private createNewLine() {
    const hooks = this.hooks.filter(hook => typeof hook.onEnter === 'function');
    for (const hook of hooks) {
      let isLoop = false;
      hook.onEnter(this, this.root.parser, () => {
        isLoop = true;
      });
      if (!isLoop) {
        break;
      }
    }
    this.viewChanged();
  }

  private paste(el: HTMLElement) {
    const fragment = this.editor.parser.parse(el, new Fragment(null));
    const c = new Contents();
    c.insertElements(fragment.sliceContents(0), 0);
    const hooks = this.hooks.filter(hook => typeof hook.onPaste === 'function');
    for (const hook of hooks) {
      let isLoop = false;
      hook.onPaste(c, this, this.root.parser, () => {
        isLoop = true;
      });
      if (!isLoop) {
        break;
      }
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

    const startPosition = this.findFirstPosition(f);
    const endPosition = this.findLastChild(f, f.contentLength - 1);

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
          p = Viewer.getPreviousPosition(range);
          range.startFragment = p.fragment;
          range.startIndex = p.index;
          range.endFragment = p.fragment;
          range.endIndex = p.index;
          // if (!direction.ctrlKey) {
          //
          // }
          break;
        case CursorMoveType.Right:
          p = Viewer.getNextPosition(range);
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

  private updateContents(ev: TBInputEvent) {
    const hooks = this.hooks.filter(hook => typeof hook.onInput === 'function');
    for (const hook of hooks) {
      let isLoop = false;
      hook.onInput(ev, this, this.root.parser, () => {
        isLoop = true;
      });
      if (!isLoop) {
        break;
      }
    }
    this.userWriteEvent.next();
    this.viewChanged();
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
        let prev = fragment.parent.getContentAtIndex(index - 1);
        if (prev instanceof Fragment) {
          while (prev) {
            const last = (prev as Fragment).getContentAtIndex((prev as Fragment).contentLength - 1);
            if (last instanceof Fragment) {
              prev = last;
            } else {
              let len = (prev as Fragment).contentLength;
              const c = (prev as Fragment).getContentAtIndex(len - 1);
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
    if (offset === currentFragment.contentLength - 1) {
      const c = currentFragment.getContentAtIndex(offset);
      if (c instanceof Single && c.tagName === 'br') {
        offset++;
      }
    }

    if (offset < currentFragment.contentLength) {
      return {
        fragment: currentFragment,
        index: offset + 1
      }
    }
    let fragment = currentFragment;
    while (fragment.parent) {
      const index = fragment.getIndexInParent();
      if (index === fragment.parent.contentLength - 1) {
        fragment = fragment.parent;
      } else {
        let next = fragment.parent.getContentAtIndex(index + 1);
        if (next instanceof Fragment) {
          while (next) {
            const first = (next as Fragment).getContentAtIndex(0);
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
    let index = currentFragment.contentLength;
    const c = currentFragment.getContentAtIndex(index - 1);
    if (c instanceof Single && c.tagName === 'br') {
      index--;
    }
    return {
      fragment: currentFragment,
      index
    }
  }
}
