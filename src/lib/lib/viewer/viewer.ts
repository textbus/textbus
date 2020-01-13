import { fromEvent, merge, Observable, Subject } from 'rxjs';

import { template } from './template-html';
import { TBSelection } from './selection';
import { RootFragment } from '../parser/root-fragment';
import { Handler } from '../toolbar/handlers/help';
import { MatchState } from '../matcher/matcher';
import { Cursor } from './cursor';
import { TBRange } from './range';
import { Hook } from './help';
import { Editor } from '../editor';
import { Differ } from '../renderer/differ';
import { DOMElement } from '../renderer/dom-renderer';
import { findFirstPosition, findLastChild, isMac } from './tools';

export class Viewer {
  elementRef = document.createElement('div');
  onSelectionChange: Observable<TBSelection>;
  onUserWrite: Observable<void>;
  onReady: Observable<Document>;

  contentWindow: Window;
  contentDocument: Document;
  nativeSelection: Selection;
  cursor: Cursor;

  selection: TBSelection;

  private userWriteEvent = new Subject<void>();
  private selectionChangeEvent = new Subject<TBSelection>();
  private readyEvent = new Subject<Document>();

  private frame = document.createElement('iframe');
  private hooks: Hook[] = [];
  private root: RootFragment;

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
        .subscribe(ev => {
          this.nativeSelection = this.contentDocument.getSelection();
          this.selectStart(ev);
        });

      let selectionChangedTimer: number;

      fromEvent(this.contentDocument, 'selectionchange').subscribe(ev => {
        clearTimeout(selectionChangedTimer);
        this.selectionChange(ev);
      });

      this.cursor.events.onFocus.subscribe(ev => {
        this.focus(ev);
      });

      this.cursor.events.onInput.subscribe((ev: Event) => {
        this.input(ev);
        this.cursor.updateStateBySelection(this.selection);
      });

      this.cursor.keyMap({
        config: {
          key: 'Backspace'
        },

        action: ev => {
          this.delete(ev);
          selectionChangedTimer = setTimeout(() => {
            // 当全部删除后，再次删除，不会触发 selection 变化，会导致 toolbar 状态高亮异常，这里手动触发一次
            this.selectionChangeEvent.next(this.selection);
          });
        }
      });

      this.cursor.keyMap({
        config: {
          key: 'Enter'
        },
        action: (ev: Event) => {
          this.enter(ev);
        }
      });

      this.cursor.keyMap({
        config: {
          key: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
        },
        action: ev => {
          this.cursorMove(ev);
        }
      });

      this.cursor.keyMap({
        config: {
          key: 'a',
          metaKey: isMac,
          ctrlKey: !isMac
        },
        action: () => {
          this.selectAll();
        }
      });
      this.cursor.events.onPaste.subscribe(ev => {
        this.paste(ev);
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

  private cursorMove(event: Event) {
    const hooks = this.hooks.filter(hook => typeof hook.onCursorMove === 'function');
    for (const hook of hooks) {
      let isLoop = false;
      hook.onCursorMove(event, this, () => {
        isLoop = true;
      });
      if (!isLoop) {
        break;
      }
    }
    this.selection.apply();
  }

  private delete(event: Event) {
    const hooks = this.hooks.filter(hook => typeof hook.onDelete === 'function');
    for (const hook of hooks) {
      let isLoop = false;
      hook.onDelete(event, this, this.root.parser, () => {
        isLoop = true;
      });
      if (!isLoop) {
        break;
      }
    }
    this.cursor.updateStateBySelection(this.selection);
  }

  private input(event: Event) {
    const hooks = this.hooks.filter(hook => typeof hook.onInput === 'function');
    for (const hook of hooks) {
      let isLoop = false;
      hook.onInput(event, this, this.root.parser, () => {
        isLoop = true;
      });
      if (!isLoop) {
        break;
      }
    }
  }

  private focus(event: Event) {
    const hooks = this.hooks.filter(hook => typeof hook.onFocus === 'function');
    for (const hook of hooks) {
      let isLoop = false;
      hook.onFocus(event, this, () => {
        isLoop = true;
      });
      if (!isLoop) {
        break;
      }
    }
  }

  private selectStart(event: Event) {
    const hooks = this.hooks.filter(hook => typeof hook.onSelectStart === 'function');
    for (const hook of hooks) {
      let isLoop = false;
      hook.onSelectStart(event, this.nativeSelection, () => {
        isLoop = true;
      });
      if (!isLoop) {
        break;
      }
    }
    this.viewChanged();
  }

  private selectionChange(event: Event) {
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
        const r = hook.onSelectionChange(event, range, this.contentDocument, () => {
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
    this.cursor.updateStateBySelection(this.selection);
    this.selectionChangeEvent.next(tbSelection);
  }

  private enter(ev: Event) {
    const hooks = this.hooks.filter(hook => typeof hook.onEnter === 'function');
    for (const hook of hooks) {
      let isLoop = false;
      hook.onEnter(ev, this, this.root.parser, () => {
        isLoop = true;
      });
      if (!isLoop) {
        break;
      }
    }
    this.viewChanged();
  }

  private paste(event: Event) {
    const hooks = this.hooks.filter(hook => typeof hook.onPaste === 'function');
    for (const hook of hooks) {
      let isLoop = false;
      hook.onPaste(event, this, this.root.parser, () => {
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

    const startPosition = findFirstPosition(f);
    const endPosition = findLastChild(f, f.contentLength - 1);

    firstRange.startFragment = startPosition.fragment;
    firstRange.endFragment = endPosition.fragment;
    firstRange.startIndex = 0;
    firstRange.endIndex = endPosition.index;
    this.selection.addRange(firstRange);
    this.selection.apply();
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
}
