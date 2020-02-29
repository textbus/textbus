import { fromEvent, merge, Observable, Subject } from 'rxjs';
import { auditTime } from 'rxjs/operators';

import { template } from './template-html';
import { TBSelection } from './selection';
import { RootFragment } from '../parser/root-fragment';
import { Handler } from '../toolbar/handlers/help';
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
  getPreviousPosition, getRangePosition
} from './tools';
import { Fragment } from '../parser/fragment';
import { Contents } from '../parser/contents';
import { Keymap } from './events';
import { HighlightState } from '../toolbar/help';

/**
 * TBus 视图面板
 */
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
  private cleanOldCursorTimer: any;

  constructor(private editor: Editor,
              private renderer: Differ,
              private styleSheets: string[] = []) {
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

      this.styleSheets.forEach(s => {
        const style = doc.createElement('style');
        style.innerHTML = s;
        doc.head.appendChild(style);
      });

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


    this.elementRef.classList.add('tbus-wrap');
    this.frame.classList.add('tbus-frame');

    this.elementRef.appendChild(this.frame);
  }

  /**
   * 渲染一个 Fragment 到当前视图中
   * @param rootFragment
   */
  render(rootFragment: RootFragment) {
    this.root = rootFragment;
    // this.contentDocument.body.innerHTML = '';
    this.renderer.render(rootFragment.createVDom(), new DOMElement(this.contentDocument.body));
    this.updateFrameHeight();
  }

  /**
   * 给当前视图应用生命周期勾子
   * @param hook
   */
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

  /**
   * 克隆当前视图的 Selection
   */
  cloneSelection() {
    return this.selection.clone();
  }

  /**
   * 给当前视图 Selection 应用命令
   * @param handler
   */
  apply(handler: Handler) {
    const state = handler.matcher.queryState(this.selection, handler, this.editor).state;
    if (state === HighlightState.Disabled) {
      return;
    }
    const overlap = state === HighlightState.Highlight;
    if (handler.hook && typeof handler.hook.onApply === 'function') {
      handler.hook.onApply(handler.execCommand);
    }
    let selection = this.selection;
    handler.execCommand.command(selection, handler, overlap, this.root);
    this.rerender();
    this.selection.apply();
    this.selectionChangeEvent.next(selection);
  }

  /**
   * 记录编辑前的快照
   */
  recordSnapshotFromEditingBefore() {
    this.input.cleanValue();
    this.selectionSnapshot = this.selection.clone();
    this.fragmentSnapshot = this.selection.commonAncestorFragment.clone();
  }

  /**
   * 注册快捷键
   * @param keymap
   */
  registerKeymap(keymap: Keymap) {
    this.input.keymap(keymap);
  }

  private listenEvents() {
    let selectionChangedTimer: number;

    fromEvent(this.contentDocument, 'selectionchange').pipe(auditTime(10)).subscribe(() => {
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

    this.input.keymap({
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

    this.input.keymap({
      config: {
        key: 'Enter'
      },
      action: () => {
        this.invokeEnterHooks();
      }
    });
    this.input.keymap({
      config: {
        key: 'Tab'
      },
      action: (event: Event) => {
        event.preventDefault();

        const input = this.input.input;
        const value = input.value;
        const startIndex = input.selectionStart;
        const endIndex = input.selectionEnd;

        const beforeText = value.substr(0, startIndex);
        const endText = value.substr(startIndex);

        input.value = beforeText + '    ' + endText;
        input.selectionStart = startIndex + 4;
        input.selectionEnd = endIndex + 4;

        this.invokeInputHooks();
        this.input.updateStateBySelection(this.selection);
        return false;
      }
    });

    this.input.keymap({
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

    this.input.keymap({
      config: {
        key: 'a',
        ctrlKey: true
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
        const fragment = this.editor.parser.parse(div.innerHTML, new Fragment(null));
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
    this.userWriteEvent.next();
  }

  private invokeDeleteHooks() {
    const hooks = this.hooks.filter(hook => typeof hook.onDelete === 'function');
    for (const hook of hooks) {
      if (!hook.onDelete(this, this.root.parser)) {
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
      const isLoop = hook.onInput({
        beforeSelection: this.selectionSnapshot,
        beforeFragment: this.fragmentSnapshot,
        value: this.input.input.value,
        cursorOffset: this.input.input.selectionStart
      }, this, this.root.parser);
      if (!isLoop) {
        break;
      }
    }
    this.rerender();
  }

  private invokeViewUpdateBeforeHooks() {
    const hooks = this.hooks.filter(hook => typeof hook.onViewUpdateBefore === 'function');
    for (const hook of hooks) {
      const isLoop = hook.onViewUpdateBefore(this, this.root.parser);
      if (!isLoop) {
        break;
      }
    }
  }

  private invokeViewChangeHooks() {
    const hooks = this.hooks.filter(hook => typeof hook.onViewChange === 'function');
    for (const hook of hooks) {
      const isLoop = hook.onViewChange(this);
      if (!isLoop) {
        break;
      }
    }
  }

  private invokeFocusHooks() {
    const hooks = this.hooks.filter(hook => typeof hook.onFocus === 'function');
    for (const hook of hooks) {
      const isLoop = hook.onFocus(this);
      if (!isLoop) {
        break;
      }
    }
  }

  private invokeSelectStartHooks() {
    const hooks = this.hooks.filter(hook => typeof hook.onSelectStart === 'function');
    for (const hook of hooks) {
      const isLoop = hook.onSelectStart(this.nativeSelection);
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
      if (!hooks.length) {
        result.push(range);
        return;
      }
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
      const isLoop = hook.onEnter({
        beforeSelection: this.selectionSnapshot,
        beforeFragment: this.fragmentSnapshot,
        value: this.input.input.value,
        cursorOffset: this.input.input.selectionStart
      }, this, this.root.parser);
      if (!isLoop) {
        break;
      }
    }
    this.rerender();
  }

  private invokePasteHooks(contents: Contents) {
    const hooks = this.hooks.filter(hook => typeof hook.onPaste === 'function');
    for (const hook of hooks) {
      const isLoop = hook.onPaste(contents, this, this.root.parser);
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
      let range2: TBRange;
      switch (direction) {
        case CursorMoveDirection.Left:
          p = getPreviousPosition(range);
          break;
        case CursorMoveDirection.Right:
          p = getNextPosition(range);
          break;
        case CursorMoveDirection.Up:
          clearTimeout(this.cleanOldCursorTimer);
          range2 = range.clone().apply();

          if (this.oldCursorPosition) {
            p = getPreviousLinePosition(range2, this.oldCursorPosition.left, this.oldCursorPosition.top);
          } else {
            const rect = getRangePosition(range2.nativeRange);
            this.oldCursorPosition = rect;
            p = getPreviousLinePosition(range, rect.left, rect.top);
          }
          this.cleanOldCursorTimer = setTimeout(() => {
            this.oldCursorPosition = null;
          }, 3000);
          break;
        case CursorMoveDirection.Down:
          clearTimeout(this.cleanOldCursorTimer);
          range2 = range.clone().apply();

          if (this.oldCursorPosition) {
            p = getNextLinePosition(range2, this.oldCursorPosition.left, this.oldCursorPosition.top);
          } else {
            const rect = getRangePosition(range2.nativeRange);
            this.oldCursorPosition = rect;
            p = getNextLinePosition(range, rect.left, rect.top);
          }
          this.cleanOldCursorTimer = setTimeout(() => {
            this.oldCursorPosition = null;
          }, 3000);
          break;
      }
      range.startFragment = range.endFragment = p.fragment;
      range.startIndex = range.endIndex = p.index;
    });
    this.selection.apply();
    this.recordSnapshotFromEditingBefore();
  }

  private updateFrameHeight() {
    const childBody = this.contentDocument.body;
    const lastChild = childBody.lastChild;
    let height = 0;
    if (lastChild) {
      if (lastChild.nodeType === 1) {
        height = (lastChild as HTMLElement).getBoundingClientRect().bottom;
      } else {
        const div = this.contentDocument.createElement('div');
        childBody.appendChild(div);
        height = div.getBoundingClientRect().bottom;
        childBody.removeChild(div);
      }
    }
    this.frame.style.height = height + 30 + 'px';
  }
}
