import { fromEvent, merge, Observable, Subject } from 'rxjs';

import { template } from './template-html';
import { TBSelection } from './selection';
import { RootFragment } from '../parser/root-fragment';
import { Handler } from '../toolbar/handlers/help';
import { MatchState } from '../matcher/matcher';
import { Cursor } from './cursor';
import { TBRange, TBRangePosition } from './range';
import { CursorMoveDirection, Hook } from './help';
import { Editor } from '../editor';
import { Differ } from '../renderer/differ';
import { DOMElement } from '../renderer/dom-renderer';
import {
  findFirstPosition,
  findLastChild, getNextLinePosition,
  getNextPosition,
  getPreviousLinePosition,
  getPreviousPosition,
  isMac
} from './tools';
import { Fragment } from '../parser/fragment';
import { Contents } from '../parser/contents';

export class Viewer {
  elementRef = document.createElement('div');
  onSelectionChange: Observable<TBSelection>;
  onUserWrite: Observable<void>;
  onReady: Observable<Document>;

  contentWindow: Window;
  contentDocument: Document;
  nativeSelection: Selection;

  selection: TBSelection;

  private input: Cursor;
  private userWriteEvent = new Subject<void>();
  private selectionChangeEvent = new Subject<TBSelection>();
  private readyEvent = new Subject<Document>();

  private frame = document.createElement('iframe');
  private hooks: Hook[] = [];
  private root: RootFragment;

  private selectionSnapshot: TBSelection;
  private fragmentSnapshot: Fragment;

  private oldCursorPosition: { left: number, top: number } = null;

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
      this.input = new Cursor(doc);
      this.readyEvent.next(doc);
      this.elementRef.appendChild(this.input.elementRef);

      merge(...['selectstart', 'mousedown'].map(type => fromEvent(this.contentDocument, type)))
        .subscribe(() => {
          this.nativeSelection = this.contentDocument.getSelection();
          this.invokeSelectStartHooks();
        });

      this.listenEvents();
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
    this.selection.apply();
    this.selectionChangeEvent.next(selection);
  }

  recordSnapshotFromEditingBefore() {
    this.input.cleanValue();
    this.selectionSnapshot = this.selection.clone();
    this.fragmentSnapshot = this.selection.commonAncestorFragment.clone();
  }

  private listenEvents() {
    let selectionChangedTimer: number;

    fromEvent(this.contentDocument, 'selectionchange').subscribe(() => {
      clearTimeout(selectionChangedTimer);
      this.invokeSelectionChangeHooks();
    });

    this.input.events.onFocus.subscribe(() => {
      this.invokeFocusHooks();
    });

    this.input.events.onInput.subscribe(() => {
      this.invokeInputHooks();
      this.input.updateStateBySelection(this.selection);
    });

    this.input.keyMap({
      config: {
        key: 'Backspace'
      },

      action: () => {
        this.invokeDeleteHooks();
        selectionChangedTimer = setTimeout(() => {
          // 当全部删除后，再次删除，不会触发 selection 变化，会导致 toolbar 状态高亮异常，这里手动触发一次
          this.selectionChangeEvent.next(this.selection);
        });
      }
    });

    this.input.keyMap({
      config: {
        key: 'Enter'
      },
      action: () => {
        this.invokeEnterHooks();
      }
    });

    this.input.keyMap({
      config: {
        key: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
      },
      action: (ev: KeyboardEvent) => {
        const map: { [key: string]: CursorMoveDirection } = {
          ArrowLeft: CursorMoveDirection.Left,
          ArrowRight: CursorMoveDirection.Right,
          ArrowUp: CursorMoveDirection.Up,
          ArrowDown: CursorMoveDirection.Down
        };
        this.moveCursor(map[ev.key]);
      }
    });

    this.input.keyMap({
      config: {
        key: 'a',
        metaKey: isMac,
        ctrlKey: !isMac
      },
      action: () => {
        this.selectAll();
      }
    });
    this.input.events.onPaste.subscribe(() => {
      const div = document.createElement('div');
      div.style.cssText = 'width:10px; height:10px; overflow: hidden; position: fixed; left: -9999px';
      div.contentEditable = 'true';
      document.body.appendChild(div);
      div.focus();
      setTimeout(() => {
        const fragment = this.editor.parser.parse(div, new Fragment(null));
        const contents = new Contents();
        contents.insertElements(fragment.sliceContents(0), 0);
        document.body.removeChild(div);
        this.invokePasteHooks(contents);
      });
    });

    this.input.events.onCopy.subscribe(ev => {
      this.recordSnapshotFromEditingBefore();
      this.contentDocument.execCommand('copy');
      ev.preventDefault();
    });

    this.input.events.onCut.subscribe(ev => {
      this.contentDocument.execCommand('copy');
      this.invokeDeleteHooks();
      ev.preventDefault();
    });
  }

  private rerender() {
    this.invokeViewUpdateBeforeHooks();
    this.renderer.render(this.root.createVDom(), new DOMElement(this.contentDocument.body));
    this.invokeViewChangeHooks();
    this.updateFrameHeight();
  }

  private invokeDeleteHooks() {
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
    this.rerender();
    this.input.updateStateBySelection(this.selection);
  }

  private invokeInputHooks() {
    if (!this.selection.collapsed) {
      this.invokeDeleteHooks();
      this.recordSnapshotFromEditingBefore();
    }
    const hooks = this.hooks.filter(hook => typeof hook.onInput === 'function');
    for (const hook of hooks) {
      let isLoop = false;
      hook.onInput({
        beforeSelection: this.selectionSnapshot,
        beforeFragment: this.fragmentSnapshot,
        value: this.input.input.value,
        cursorOffset: this.input.input.selectionStart
      }, this, this.root.parser, () => {
        isLoop = true;
      });
      if (!isLoop) {
        break;
      }
    }
    this.rerender();
  }

  private invokeViewUpdateBeforeHooks() {
    const hooks = this.hooks.filter(hook => typeof hook.onViewUpdateBefore === 'function');
    for (const hook of hooks) {
      let isLoop = false;
      hook.onViewUpdateBefore(this, this.root.parser, () => {
        isLoop = true;
      });
      if (!isLoop) {
        break;
      }
    }
  }

  private invokeViewChangeHooks() {
    const hooks = this.hooks.filter(hook => typeof hook.onViewChange === 'function');
    for (const hook of hooks) {
      let isLoop = false;
      hook.onViewChange(this, () => {
        isLoop = true;
      });
      if (!isLoop) {
        break;
      }
    }
  }

  private invokeFocusHooks() {
    const hooks = this.hooks.filter(hook => typeof hook.onFocus === 'function');
    for (const hook of hooks) {
      let isLoop = false;
      hook.onFocus(this, () => {
        isLoop = true;
      });
      if (!isLoop) {
        break;
      }
    }
  }

  private invokeSelectStartHooks() {
    const hooks = this.hooks.filter(hook => typeof hook.onSelectStart === 'function');
    for (const hook of hooks) {
      let isLoop = false;
      hook.onSelectStart(this.nativeSelection, () => {
        isLoop = true;
      });
      if (!isLoop) {
        break;
      }
    }
  }

  private invokeSelectionChangeHooks() {
    const tbSelection = new TBSelection(this.contentDocument);
    const ranges: Range[] = [];
    if (this.nativeSelection.rangeCount) {
      for (let i = 0; i < this.nativeSelection.rangeCount; i++) {
        ranges.push(this.nativeSelection.getRangeAt(i));
      }
    }

    let result: Range[] = [];
    ranges.forEach(range => {
      const hooks = this.hooks.filter(hook => typeof hook.onSelectionChange === 'function');
      for (const hook of hooks) {
        let isLoop = false;
        result = [];
        const r = hook.onSelectionChange(range, this.contentDocument, () => {
          isLoop = true;
        });
        if (Array.isArray(r)) {
          result.push(...r);
        } else {
          result.push(r);
        }
        if (!isLoop) {
          break;
        }
      }
    });
    result.forEach(item => {
      tbSelection.addRange(new TBRange(item));
    });

    this.selection = tbSelection;
    this.input.updateStateBySelection(this.selection);
    this.selectionChangeEvent.next(tbSelection);
  }

  private invokeEnterHooks() {
    const hooks = this.hooks.filter(hook => typeof hook.onEnter === 'function');
    for (const hook of hooks) {
      let isLoop = false;
      hook.onEnter({
        beforeSelection: this.selectionSnapshot,
        beforeFragment: this.fragmentSnapshot,
        value: this.input.input.value,
        cursorOffset: this.input.input.selectionStart
      }, this, this.root.parser, () => {
        isLoop = true;
      });
      if (!isLoop) {
        break;
      }
    }
    this.rerender();
  }

  private invokePasteHooks(contents: Contents) {
    const hooks = this.hooks.filter(hook => typeof hook.onPaste === 'function');
    for (const hook of hooks) {
      let isLoop = false;
      hook.onPaste(contents, this, this.root.parser, () => {
        isLoop = true;
      });
      if (!isLoop) {
        break;
      }
    }
    this.rerender();
  }

  private selectAll() {
    const firstRange = this.selection.firstRange;
    this.selection.removeAllRanges();
    let f = firstRange.startFragment;
    while (f.parent) {
      f = f.parent;
    }

    const startPosition = findFirstPosition(f);
    const endPosition = findLastChild(f, f.contentLength - 1);

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
      switch (direction) {
        case CursorMoveDirection.Left:
          p = getPreviousPosition(range);
          break;
        case CursorMoveDirection.Right:
          p = getNextPosition(range);
          break;
        case CursorMoveDirection.Up:
          if (this.oldCursorPosition) {
            p = getPreviousLinePosition(range, this.oldCursorPosition.left, this.oldCursorPosition.top);
          } else {
            const range2 = range.clone().apply();
            const rect = range2.nativeRange.getBoundingClientRect();
            this.oldCursorPosition = rect;
            p = getPreviousLinePosition(range, rect.left, rect.top);
          }
          break;
        case CursorMoveDirection.Down:
          if (this.oldCursorPosition) {
            p = getNextLinePosition(range, this.oldCursorPosition.left, this.oldCursorPosition.top);
          } else {
            const range2 = range.clone().apply();
            const rect = range2.nativeRange.getBoundingClientRect();
            this.oldCursorPosition = rect;
            p = getNextLinePosition(range, rect.left, rect.top);
          }
          break;
      }
      range.startFragment = range.endFragment = p.fragment;
      range.startIndex = range.endIndex = p.index;
    });

    this.selection.apply();
    this.recordSnapshotFromEditingBefore();
  }

  private updateFrameHeight() {
    this.frame.style.height = this.contentDocument.documentElement.scrollHeight + 'px';
  }
}
