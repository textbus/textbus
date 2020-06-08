import { auditTime, filter, sampleTime, switchMap, tap } from 'rxjs/operators';
import { from, fromEvent, merge, Observable, of, Subject, Subscription, zip } from 'rxjs';

import {
  Commander,
  Contents,
  EventType,
  Fragment,
  InlineFormatter,
  Lifecycle,
  MediaTemplate,
  Parser,
  RangePath,
  Renderer, TBRange, TBRangePosition,
  TBSelection,
  TemplateTranslator,
  VElement
} from './core/_api';
import { Viewer } from './viewer/_api';
import { ContextMenu, EventDelegate, HighlightState, Toolbar, ToolConfig, ToolFactory } from './toolbar/_api';
import { BlockTemplate, SingleTemplate } from './templates/_api';
import { Input, KeymapAction } from './input/input';

export interface Snapshot {
  contents: Fragment;
  paths: RangePath[];
}

export interface EditorOptions {
  /** 设置主题 */
  theme?: string;
  /** 设置最大历史栈 */
  historyStackSize?: number;
  /** 设置模板转换器 */
  templateTranslators?: TemplateTranslator[];
  /** 设置格式转换器 */
  formatters?: InlineFormatter[];
  /** 工具条配置 */
  toolbar?: (ToolFactory | ToolFactory[])[];
  /** 配置生命周期勾子 */
  hooks?: Lifecycle[];
  /** 配置编辑器的默认样式 */
  styleSheets?: string[];

  /** 当某些工具需要上传资源时的调用函数，调用时会传入上传资源的类型，如 image、video、audio等，该函数返回一个字符串，作为资源的 url 地址 */
  uploader?(type: string): (string | Promise<string> | Observable<string>);

  /** 设置初始化 TBus 时的默认内容 */
  contents?: string;
}

export enum CursorMoveDirection {
  Left,
  Right,
  Up,
  Down
}

export class Editor implements EventDelegate {
  readonly onChange: Observable<void>;

  get canBack() {
    return this.historySequence.length > 0 && this.historyIndex > 0;
  }

  get canForward() {
    return this.historySequence.length > 0 && this.historyIndex < this.historySequence.length - 1;
  }

  readonly elementRef = document.createElement('div');

  private readonly frameContainer = document.createElement('div');
  private readonly container: HTMLElement;

  private parser: Parser;
  private viewer: Viewer;
  private toolbar: Toolbar;
  private input: Input;
  private renderer = new Renderer();
  private contextMenu = new ContextMenu(this.renderer);

  private readyState = false;
  private tasks: Array<() => void> = [];

  private historySequence: Array<Snapshot> = [];
  private historyIndex = 0;
  private readonly historyStackSize: number;

  private canEditable = false;
  private selection: TBSelection;

  private defaultHTML = '<p><br></p>';
  private rootFragment: Fragment;
  private sub: Subscription;
  private changeEvent = new Subject<void>();

  private selectionSnapshot: TBSelection;
  private fragmentSnapshot: Fragment;

  private oldCursorPosition: { left: number, top: number } = null;
  private cleanOldCursorTimer: any;

  private onUserWrite: Observable<void>;
  private userWriteEvent = new Subject<void>();


  constructor(public selector: string | HTMLElement, public options: EditorOptions) {
    this.onUserWrite = this.userWriteEvent.asObservable();
    if (typeof selector === 'string') {
      this.container = document.querySelector(selector);
    } else {
      this.container = selector;
    }
    this.historyStackSize = options.historyStackSize || 50;
    this.onChange = this.changeEvent.asObservable();

    this.parser = new Parser(options);

    this.frameContainer.classList.add('tbus-frame-container');

    this.toolbar = new Toolbar(this, this.contextMenu, options.toolbar);
    this.viewer = new Viewer(options.styleSheets);
    this.toolbar.onAction
      .pipe(filter(() => this.canEditable))
      .subscribe(config => {
        this.apply(config.config, config.instance.commander);
        if (config.instance.commander.recordHistory) {
          this.recordSnapshot();
          this.listenUserWriteEvent();
        }
      });

    this.viewer.onSelectionChange.pipe(tap(() => {
      this.selection = new TBSelection(this.viewer.contentDocument, this.renderer);
    }), auditTime(100)).subscribe(() => {
      const event = document.createEvent('Event');
      event.initEvent('click', true, true);
      this.elementRef.dispatchEvent(event);
      this.toolbar.updateHandlerState(this.selection, this.renderer);
    });
    const unsub = zip(from(this.writeContents(options.contents || this.defaultHTML)), this.viewer.onReady).pipe(switchMap(result => {
      this.readyState = true;
      this.rootFragment = this.parser.parse(result[0]);
      this.render();
      this.tasks.forEach(fn => fn());
      this.setup();
      return this.viewer.onCanEditable;
    })).subscribe(() => {
      this.canEditable = true;
      this.recordSnapshot();
      unsub.unsubscribe();
    });

    this.elementRef.appendChild(this.toolbar.elementRef);
    this.elementRef.appendChild(this.frameContainer);
    this.frameContainer.appendChild(this.viewer.elementRef);

    this.elementRef.classList.add('tbus-container');
    if (options.theme) {
      this.elementRef.classList.add('tbus-theme-' + options.theme);
    }
    this.container.appendChild(this.elementRef);

    this.listenUserWriteEvent();

  }

  setContents(html: string) {
    this.run(() => {
      this.writeContents(html).then(el => {
        this.rootFragment = this.parser.parse(el);
        this.render();
      });
    })
  }

  dispatchEvent(type: string): Observable<string> {
    if (typeof this.options.uploader === 'function') {
      const result = this.options.uploader(type);
      if (result instanceof Observable) {
        return result;
      } else if (result instanceof Promise) {
        return from(result);
      } else if (typeof result === 'string') {
        return of(result);
      }
    }
    return of('');
  }

  getPreviousSnapshot() {
    if (this.canBack) {
      this.historyIndex--;
      this.historyIndex = Math.max(0, this.historyIndex);
      return Editor.cloneHistoryData(this.historySequence[this.historyIndex]);
    }
    return null;
  }

  getNextSnapshot() {
    if (this.canForward) {
      this.historyIndex++;
      return Editor.cloneHistoryData(this.historySequence[this.historyIndex]);
    }
    return null;
  }

  getContents() {
    const contents = (this.options.hooks || []).reduce((previousValue, currentValue) => {
      if (typeof currentValue.onOutput === 'function') {
        return currentValue.onOutput(previousValue);
      }
      return previousValue;
    }, this.renderer.renderToString(this.rootFragment));
    return {
      styleSheets: this.options.styleSheets,
      contents
    };
  }

  registerKeymap(action: KeymapAction) {
    this.run(() => {
      this.viewer.input.keymap(action);
    });
  }

  private write(selection: TBSelection) {
    const startIndex = this.selectionSnapshot.firstRange.startIndex;
    const commonAncestorFragment = selection.commonAncestorFragment;
    const fragmentSnapshot = this.fragmentSnapshot.clone();

    commonAncestorFragment.delete(0);
    fragmentSnapshot.sliceContents(0).forEach(item => commonAncestorFragment.append(item));
    fragmentSnapshot.getFormatRanges().forEach(f => commonAncestorFragment.mergeFormat(f));

    let index = 0;
    this.viewer.input.input.value.replace(/\n+|[^\n]+/g, (str) => {
      if (/\n+/.test(str)) {
        for (let i = 0; i < str.length; i++) {
          const s = new SingleTemplate('br');
          commonAncestorFragment.insert(s, index + startIndex);
          index++;
        }
      } else {
        commonAncestorFragment.insert(str, startIndex + index);
        index += str.length;
      }
      return str;
    });

    selection.firstRange.startIndex = selection.firstRange.endIndex = startIndex + this.viewer.input.input.selectionStart;
    const last = commonAncestorFragment.getContentAtIndex(commonAncestorFragment.contentLength - 1);
    if (startIndex + this.viewer.input.input.selectionStart === commonAncestorFragment.contentLength &&
      last instanceof SingleTemplate && last.tagName === 'br') {
      commonAncestorFragment.append(new SingleTemplate('br'));
    }
    this.userWriteEvent.next();
  }

  private setup() {
    merge(...['selectstart', 'mousedown'].map(type => fromEvent(this.contentDocument, type)))
      .subscribe(() => {
        this.nativeSelection = this.contentDocument.getSelection();
        this.nativeSelection.removeAllRanges();
        this.canEditableEvent.next();
      });
    fromEvent(this.contentDocument, 'selectionchange').subscribe(() => {
      this.selectionChangeEvent.next(this.nativeSelection);
      this.input.updateStateBySelection(this.nativeSelection);
    })
    (this.options.hooks || []).forEach(hooks => {
      if (typeof hooks.setup === 'function') {
        hooks.setup(this.viewer.contentDocument);
      }
    })
    this.viewer.input.events.onFocus.subscribe(() => {
      this.recordSnapshotFromEditingBefore();
    })
    this.viewer.input.events.onInput.subscribe(() => {
      const selection = this.selection;
      const collapsed = selection.collapsed;
      let isNext = true;
      (this.options.hooks || []).forEach(lifecycle => {
        if (typeof lifecycle.onInput === 'function') {
          if (lifecycle.onInput(this.renderer, selection) === false) {
            isNext = false;
          } else {
            if (!selection.collapsed) {
              throw new Error('输入前选区必须闭合！');
            }
          }
        }
      })
      if (isNext) {
        if (!collapsed) {
          this.recordSnapshotFromEditingBefore(true);
        }
        this.write(selection);
      }
      this.render();
      selection.restore();
      this.viewer.input.updateStateBySelection(this.viewer.nativeSelection);
    })
    this.viewer.input.events.onPaste.subscribe(() => {
      const div = document.createElement('div');
      div.style.cssText = 'width:10px; height:10px; overflow: hidden; position: fixed; left: -9999px';
      div.contentEditable = 'true';
      document.body.appendChild(div);
      div.focus();
      setTimeout(() => {
        const fragment = this.parser.parse(div);
        const contents = new Contents();
        fragment.sliceContents(0).forEach(i => contents.append(i));
        document.body.removeChild(div);
        let isNext = true;
        (this.options.hooks || []).forEach(lifecycle => {
          if (typeof lifecycle.onPaste === 'function') {
            if (lifecycle.onPaste(contents, this.renderer, this.selection) === false) {
              isNext = false;
            }
          }
        })
        if (isNext) {
          this.paste(contents);
        }
      });
    });

    this.viewer.input.events.addKeymap({
      keymap: {
        key: 'Enter'
      },
      action: () => {
        const focusNode = this.viewer.nativeSelection.focusNode;
        let el = focusNode.nodeType === 3 ? focusNode.parentNode : focusNode;
        const vElement = this.renderer.getVDomByNativeNode(el) as VElement;
        if (!vElement) {
          return;
        }
        const selection = this.selection;
        let isNext = true;
        (this.options.hooks || []).forEach(lifecycle => {
          if (typeof lifecycle.onEnter === 'function') {
            if (lifecycle.onEnter(this.renderer, selection) === false) {
              isNext = false;
            }
          }
        })
        if (isNext) {
          this.renderer.dispatchEvent(vElement, EventType.onEnter, selection);
        }
        this.render();
        selection.restore();
        this.viewer.input.updateStateBySelection(this.viewer.nativeSelection);
        this.recordSnapshotFromEditingBefore();
        this.userWriteEvent.next();
      }
    })
    this.viewer.input.events.addKeymap({
      keymap: {
        key: 'Backspace'
      },
      action: () => {
        const focusNode = this.viewer.nativeSelection.focusNode;
        let el = focusNode.nodeType === 3 ? focusNode.parentNode : focusNode;
        const vElement = this.renderer.getVDomByNativeNode(el) as VElement;
        if (!vElement) {
          return;
        }
        const selection = this.selection;
        let isNext = true;
        (this.options.hooks || []).forEach(lifecycle => {
          if (typeof lifecycle.onDelete === 'function') {
            if (lifecycle.onDelete(this.renderer, selection) === false) {
              isNext = false;
            }
          }
        })
        if (isNext) {
          this.renderer.dispatchEvent(vElement, EventType.onDelete, selection);
        }
        if (this.rootFragment.contentLength === 0) {
          const p = new BlockTemplate('p');
          const fragment = new Fragment();
          fragment.append(new SingleTemplate('br'));
          p.childSlots.push(fragment);
          this.rootFragment.append(p);
          selection.firstRange.setStart(fragment, 0);
          selection.firstRange.collapse();
        }
        this.render();
        selection.restore();
        this.viewer.input.updateStateBySelection(this.viewer.nativeSelection);
        this.recordSnapshotFromEditingBefore();
        this.userWriteEvent.next();
      }
    })
    this.viewer.input.keymap({
      keymap: {
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
    this.viewer.input.keymap({
      keymap: {
        key: 'a',
        ctrlKey: true
      },
      action: () => {
        this.selectAll();
      }
    });
  }

  private selectAll() {
    const selection = this.selection;
    const firstRange = selection.firstRange;
    const firstPosition = firstRange.findFirstPosition(this.rootFragment);
    const lastPosition = firstRange.findLastChild(this.rootFragment);
    selection.removeAllRanges();

    firstRange.setStart(firstPosition.fragment, firstPosition.index);
    firstRange.setEnd(lastPosition.fragment, lastPosition.index);

    selection.addRange(firstRange);
    selection.restore();
  }

  private paste(contents: Contents) {
    const firstRange = this.selection.firstRange;
    const fragment = firstRange.startFragment;
    let i = 0
    contents.slice(0).forEach(item => {
      fragment.insert(item, firstRange.startIndex + i);
      i += item.length;
    });
    // firstRange.startIndex = firstRange.endIndex = firstRange.startIndex + contents.length;
    this.render();
    this.viewer.updateFrameHeight();
    // this.selection.restore();
  }

  /**
   * 记录编辑前的快照
   */
  private recordSnapshotFromEditingBefore(keepInputStatus = false) {
    if (!keepInputStatus) {
      this.viewer.input.cleanValue();
    }
    this.selectionSnapshot = this.selection.clone();
    this.fragmentSnapshot = this.selectionSnapshot.commonAncestorFragment.clone();
  }

  private apply(config: ToolConfig, commander: Commander) {
    const selection = this.selection;
    const state = config.match ?
      config.match.queryState(selection, this.renderer, this).state :
      HighlightState.Normal;
    if (state === HighlightState.Disabled) {
      return;
    }
    const overlap = state === HighlightState.Highlight;
    let isNext = true;
    (this.options.hooks || []).forEach(lifecycle => {
      if (typeof lifecycle.onApplyCommand === 'function' &&
        lifecycle.onApplyCommand(commander, selection, this) === false) {
        isNext = false;
      }
    })
    if (isNext) {
      commander.command(selection, overlap, this.renderer, this.rootFragment, this.parser);
      this.render();
      selection.restore();
      this.toolbar.updateHandlerState(selection, this.renderer);
    }
  }

  private render() {
    const rootFragment = this.rootFragment;
    const last = rootFragment.sliceContents(rootFragment.contentLength - 1)[0];
    if (!(last instanceof BlockTemplate) || last.tagName !== 'p') {
      const p = new BlockTemplate('p');
      const fragment = new Fragment();
      fragment.append(new SingleTemplate('br'));
      p.childSlots.push(fragment);
      rootFragment.append(p);
    }
    this.renderer.render(rootFragment, this.viewer.contentDocument.body).events.subscribe(event => {
      if (event.type === EventType.onDelete) {
        this.selection.ranges.forEach(range => {
          if (!range.collapsed) {
            range.connect();
            return;
          }
          if (range.startIndex > 0) {
            range.commonAncestorFragment.delete(range.startIndex - 1, 1);
            range.startIndex = range.endIndex = range.startIndex - 1;
            if (range.commonAncestorFragment.contentLength === 0) {
              range.commonAncestorFragment.append(new SingleTemplate('br'));
            }
          } else {
            const firstContent = range.startFragment.getContentAtIndex(0);
            if (firstContent instanceof MediaTemplate && firstContent.tagName === 'br') {
              range.startFragment.delete(0, 1);
              if (range.startFragment.contentLength === 0) {
                let position = range.getPreviousPosition();
                if (position.fragment === range.startFragment && position.index === range.startIndex) {
                  position = range.getNextPosition();
                }
                range.deleteEmptyTree(range.startFragment);
                range.setStart(position.fragment, position.index);
                range.collapse();
              }
            } else {
              const prevPosition = range.getPreviousPosition();
              if (prevPosition.fragment !== range.startFragment) {
                range.setStart(prevPosition.fragment, prevPosition.index);
                const last = prevPosition.fragment.getContentAtIndex(prevPosition.index - 1);
                if (last instanceof MediaTemplate && last.tagName === 'br') {
                  range.startIndex--;
                }
                range.connect();
              }
            }
          }
        });
      }
    });

    this.viewer.updateFrameHeight();
  }

  private moveCursor(direction: CursorMoveDirection) {
    const selection = this.selection;
    selection.ranges.forEach(range => {
      let p: TBRangePosition;
      let range2: TBRange;
      switch (direction) {
        case CursorMoveDirection.Left:
          p = range.getPreviousPosition();
          break;
        case CursorMoveDirection.Right:
          p = range.getNextPosition();
          break;
        case CursorMoveDirection.Up:
          clearTimeout(this.cleanOldCursorTimer);
          range2 = range.clone().restore();

          if (this.oldCursorPosition) {
            p = range2.getPreviousLinePosition(this.oldCursorPosition.left, this.oldCursorPosition.top);
          } else {
            const rect = range2.getRangePosition();
            this.oldCursorPosition = rect;
            p = range.getPreviousLinePosition(rect.left, rect.top);
          }
          this.cleanOldCursorTimer = setTimeout(() => {
            this.oldCursorPosition = null;
          }, 3000);
          break;
        case CursorMoveDirection.Down:
          clearTimeout(this.cleanOldCursorTimer);
          range2 = range.clone().restore();

          if (this.oldCursorPosition) {
            p = range2.getNextLinePosition(this.oldCursorPosition.left, this.oldCursorPosition.top);
          } else {
            const rect = range2.getRangePosition();
            this.oldCursorPosition = rect;
            p = range.getNextLinePosition(rect.left, rect.top);
          }
          this.cleanOldCursorTimer = setTimeout(() => {
            this.oldCursorPosition = null;
          }, 3000);
          break;
      }
      range.startFragment = range.endFragment = p.fragment;
      range.startIndex = range.endIndex = p.index;
    });
    selection.restore();
    this.recordSnapshotFromEditingBefore();
  }

  private recordSnapshot() {
    if (this.historySequence.length !== this.historyIndex) {
      this.historySequence.length = this.historyIndex + 1;
    }
    this.historySequence.push({
      contents: this.rootFragment.clone(),
      paths: this.selection ? this.selection.getRangePaths() : []
    });
    if (this.historySequence.length > this.historyStackSize) {
      this.historySequence.shift();
    }
    this.historyIndex = this.historySequence.length - 1;
    this.dispatchContentChangeEvent();
  }

  private run(fn: () => void) {
    if (!this.readyState) {
      this.tasks.push(fn);
      return;
    }
    fn();
  }

  private writeContents(html: string) {
    return new Promise<HTMLElement>(resolve => {
      const temporaryIframe = document.createElement('iframe');
      temporaryIframe.onload = () => {
        const body = temporaryIframe.contentDocument.body;
        document.body.removeChild(temporaryIframe);
        resolve(body);
      };
      temporaryIframe.style.cssText =
        'position: absolute;' +
        'left: -9999px;' +
        'top: -9999px;' +
        'width:0;' +
        'height:0;' +
        'opacity:0';
      temporaryIframe.src = `javascript:void((function () {
                      document.open();
                      document.write('${html.replace(/[']/g, '\\\'')}');
                      document.close();
                    })())`;

      document.body.appendChild(temporaryIframe);
    });
  }

  private dispatchContentChangeEvent() {
    this.changeEvent.next();
  }

  private listenUserWriteEvent() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
    this.sub = this.onUserWrite.pipe(tap(() => {
      this.dispatchContentChangeEvent();
    })).pipe(sampleTime(5000)).subscribe(() => {
      this.recordSnapshot();
      this.toolbar.updateHandlerState(this.selection, this.renderer);
    });
  }

  private static cloneHistoryData(snapshot: Snapshot): Snapshot {
    return {
      contents: snapshot.contents.clone(),
      paths: snapshot.paths.map(i => i)
    }
  }
}
