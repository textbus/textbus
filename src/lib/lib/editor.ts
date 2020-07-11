import { auditTime, distinctUntilChanged, map, sampleTime, tap } from 'rxjs/operators';
import { from, fromEvent, merge, Observable, of, Subject, Subscription, zip } from 'rxjs';

import {
  BackboneTemplate,
  BranchTemplate,
  Commander,
  Contents,
  EventType,
  Formatter,
  Fragment,
  LeafTemplate,
  Lifecycle,
  Parser,
  Renderer,
  TBRange,
  TBRangePosition,
  TBSelection,
  Template,
  TemplateTranslator,
  VElement
} from './core/_api';
import { Viewer } from './viewer/viewer';
import { ContextMenu, EventDelegate, HighlightState, Toolbar, ToolConfig, ToolFactory } from './toolbar/_api';
import { BlockTemplate, SingleTagTemplate } from './templates/_api';
import { KeymapAction } from './viewer/input';
import { StatusBar } from './status-bar/status-bar';
import { TemplateExample } from './workbench/template-stage';
import { EventHandler } from './event-handler';
import { Workbench } from './workbench/workbench';
import { HistoryManager } from './history-manager';

export interface EditorOptions {
  /** 设置主题 */
  theme?: string;
  /** 设备宽度 */
  deviceWidth?: string;
  /** 设置最大历史栈 */
  historyStackSize?: number;
  /** 设置模板转换器 */
  templateTranslators?: TemplateTranslator[];
  /** 设置格式转换器 */
  formatters?: Formatter[];
  /** 工具条配置 */
  toolbar?: (ToolFactory | ToolFactory[])[];
  /** 配置生命周期勾子 */
  hooks?: Lifecycle[];
  /** 配置编辑器的默认样式 */
  styleSheets?: string[];
  /** 设置初始化 TBus 时的默认内容 */
  contents?: string;
  /** 设置可选的自定义模板 */
  templateExamples?: TemplateExample[];

  /** 当某些工具需要上传资源时的调用函数，调用时会传入上传资源的类型，如 image、video、audio等，该函数返回一个字符串，作为资源的 url 地址 */
  uploader?(type: string): (string | Promise<string> | Observable<string>);
}

export enum CursorMoveDirection {
  Left,
  Right,
  Up,
  Down
}

export class Editor implements EventDelegate {
  readonly onReady: Observable<void>;
  readonly onChange: Observable<void>;
  readonly history: HistoryManager;

  readonly elementRef = document.createElement('div');

  private readonly container: HTMLElement;

  private workbench: Workbench;
  private viewer: Viewer;
  private parser: Parser;
  private toolbar: Toolbar;
  private renderer = new Renderer();
  private statusBar = new StatusBar();
  private contextMenu = new ContextMenu(this.renderer);

  private readyState = false;
  private tasks: Array<() => void> = [];

  private nativeSelection: Selection;
  private selection: TBSelection;

  private defaultHTML = '<p><br></p>';
  private rootFragment: Fragment;
  private snapshotSubscription: Subscription;
  private readyEvent = new Subject<void>();
  private changeEvent = new Subject<void>();

  private selectionSnapshot: TBSelection;
  private fragmentSnapshot: Fragment;

  private oldCursorPosition: { left: number, top: number } = null;
  private cleanOldCursorTimer: any;

  private onUserWrite: Observable<void>;
  private userWriteEvent = new Subject<void>();

  private eventHandler = new EventHandler();

  private subs: Subscription[] = [];

  constructor(public selector: string | HTMLElement, public options: EditorOptions) {
    this.onUserWrite = this.userWriteEvent.asObservable();
    if (typeof selector === 'string') {
      this.container = document.querySelector(selector);
    } else {
      this.container = selector;
    }
    this.onReady = this.readyEvent.asObservable();
    this.onChange = this.changeEvent.asObservable();

    this.history = new HistoryManager(options.historyStackSize)
    this.parser = new Parser(options);
    this.toolbar = new Toolbar(this, this.contextMenu, options.toolbar);
    this.viewer = new Viewer(options.styleSheets);
    this.workbench = new Workbench(this.viewer);
    const deviceWidth = options.deviceWidth || '100%';
    this.statusBar.device.update(deviceWidth);
    this.statusBar.fullScreen.full = false;
    this.workbench.setTabletWidth(deviceWidth);

    if (Array.isArray(options.templateExamples)) {
      options.templateExamples.forEach(i => this.workbench.templateStage.addTemplate(i));
    }

    this.subs.push(
      this.toolbar.onTemplatesStageChange.subscribe(b => {
        this.workbench.templateStage.expand = b;
      }),
      this.workbench.templateStage.onCheck.subscribe(template => {
        if (this.selection && this.selection.rangeCount) {
          this.insertTemplate(template);
        }
      }),
      this.statusBar.device.onChange.subscribe(value => {
        this.workbench.setTabletWidth(value);
        this.invokeViewUpdatedHooks();
      }),
      this.statusBar.fullScreen.onChange.subscribe(b => {
        b ? this.elementRef.classList.add('tbus-container-full-screen') : this.elementRef.classList.remove('tbus-container-full-screen');

        this.invokeViewUpdatedHooks();
      }),
      zip(from(this.writeContents(options.contents || this.defaultHTML)), this.viewer.onReady).subscribe(result => {
        this.readyState = true;
        this.rootFragment = this.parser.parse(result[0]);
        this.render();
        this.setup();
        this.readyEvent.next();
      })
    );

    this.elementRef.appendChild(this.toolbar.elementRef);
    this.elementRef.appendChild(this.workbench.elementRef);
    this.elementRef.append(this.statusBar.elementRef);
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

  getJSONLiteral() {
    return {
      styleSheets: this.options.styleSheets,
      contents: this.renderer.renderToJSON(this.rootFragment)
    };
  }

  registerKeymap(action: KeymapAction) {
    this.run(() => {
      this.viewer.input.keymap(action);
    });
  }

  destroy() {
    this.container.removeChild(this.elementRef);
    this.subs.forEach(s => s.unsubscribe());

    this.readyEvent.complete();
    this.changeEvent.complete();
    this.history.destroy();
  }

  private setup() {
    this.subs.push(
      merge(...['selectstart', 'mousedown'].map(type => fromEvent(this.viewer.contentDocument, type)))
        .subscribe(() => {
          this.nativeSelection = this.viewer.contentDocument.getSelection();
          this.nativeSelection.removeAllRanges();
        }));
    (this.options.hooks || []).forEach(hooks => {
      if (typeof hooks.setup === 'function') {
        hooks.setup(this.renderer, this.viewer.contentDocument, this.viewer.contentWindow, this.workbench.tablet);
      }
    })

    this.subs.push(
      fromEvent(this.viewer.contentDocument, 'selectionchange').pipe(tap(() => {
        this.selection = this.options.hooks.reduce((selection, lifecycle) => {
          if (typeof lifecycle.onSelectionChange === 'function') {
            lifecycle.onSelectionChange(this.renderer, selection, this.viewer.contentDocument);
          }
          return selection;
        }, new TBSelection(this.viewer.contentDocument, this.renderer));
        this.viewer.input.updateStateBySelection(this.nativeSelection);
      }), auditTime(100), tap(() => {
        const event = document.createEvent('Event');
        event.initEvent('click', true, true);
        this.elementRef.dispatchEvent(event);
        this.toolbar.updateHandlerState(this.selection, this.renderer);
      }), map(() => {
        return this.nativeSelection.focusNode;
      }), distinctUntilChanged()).subscribe(node => {
        this.statusBar.paths.update(node);
      }),
      this.toolbar.onAction.subscribe(config => {
        if (this.selection) {
          this.apply(config.config, config.instance.commander);
          if (config.instance.commander.recordHistory) {
            this.history.recordSnapshot(this.rootFragment, this.selection);
            this.listenUserWriteEvent();
          }
        }
      }),
      this.viewer.input.events.onFocus.subscribe(() => {
        this.recordSnapshotFromEditingBefore();
      }),
      this.viewer.input.events.onInput.subscribe(() => {

        this.dispatchEventAndCallHooks(EventType.onInput, {
          selectionSnapshot: this.selectionSnapshot,
          fragmentSnapshot: this.fragmentSnapshot,
          input: this.viewer.input
        }, () => {
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
          }
          return isNext;
        })
        const focusNode = this.nativeSelection.focusNode;
        let el = focusNode.nodeType === 3 ? focusNode.parentNode : focusNode;
        const vElement = this.renderer.getVDomByNativeNode(el) as VElement;
        if (!vElement) {
          return;
        }
        this.userWriteEvent.next();
        this.render();
        this.selection.restore();
        this.viewer.input.updateStateBySelection(this.nativeSelection);
      }),
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

          this.dispatchEventAndCallHooks(EventType.onPaste, {
            clipboard: contents
          }, () => {
            let isNext = true;
            (this.options.hooks || []).forEach(lifecycle => {
              if (typeof lifecycle.onPaste === 'function') {
                if (lifecycle.onPaste(contents, this.renderer, this.selection) === false) {
                  isNext = false;
                }
              }
            })
            return isNext;
          })
          this.render();
          this.selection.restore();
          this.invokeViewUpdatedHooks();
        });
      }),
      this.viewer.input.events.onCopy.subscribe(() => {
        this.viewer.contentDocument.execCommand('copy');
      }),
      this.viewer.input.events.onCut.subscribe(() => {
        this.viewer.contentDocument.execCommand('copy');
        this.selection.ranges.forEach(range => {
          range.connect();
        });
        this.render();
        this.selection.restore();
        this.invokeViewUpdatedHooks();
        this.history.recordSnapshot(this.rootFragment, this.selection);
        this.recordSnapshotFromEditingBefore();
      })
    );

    this.viewer.input.events.addKeymap({
      keymap: {
        key: 'Enter'
      },
      action: () => {
        this.dispatchEventAndCallHooks(EventType.onEnter, null, () => {
          let isNext = true;
          (this.options.hooks || []).forEach(lifecycle => {
            if (typeof lifecycle.onEnter === 'function') {
              if (lifecycle.onEnter(this.renderer, this.selection) === false) {
                isNext = false;
              }
            }
          });
          return isNext;
        })

        this.render();
        this.selection.restore();
        this.viewer.input.updateStateBySelection(this.nativeSelection);
        this.recordSnapshotFromEditingBefore();
        this.userWriteEvent.next();
      }
    })
    this.viewer.input.events.addKeymap({
      keymap: {
        key: 'Backspace'
      },
      action: () => {
        const focusNode = this.nativeSelection.focusNode;
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
          p.slot.append(new SingleTagTemplate('br'));
          this.rootFragment.append(p);
          selection.firstRange.setStart(p.slot, 0);
          selection.firstRange.collapse();
        }
        this.render();
        selection.restore();
        this.viewer.input.updateStateBySelection(this.nativeSelection);
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

    this.tasks.forEach(fn => fn());
    this.history.recordSnapshot(this.rootFragment, this.selection);
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

  /**
   * 记录编辑前的快照
   */
  private recordSnapshotFromEditingBefore(keepInputStatus = false) {
    if (!keepInputStatus) {
      this.viewer.input.cleanValue();
    }
    this.selectionSnapshot = this.selection.clone();
    this.fragmentSnapshot = this.selectionSnapshot.commonAncestorFragment?.clone();
  }

  private apply(config: ToolConfig, commander: Commander) {
    const selection = this.selection;
    const state = config.matcher ?
      config.matcher.queryState(selection, this.renderer, this).state :
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
      commander.command(selection, overlap, this.renderer, this.rootFragment);
      this.render();
      selection.restore();
      this.toolbar.updateHandlerState(selection, this.renderer);
    }
  }

  private render() {
    const rootFragment = this.rootFragment;
    Editor.guardLastIsParagraph(rootFragment);
    const vEle = this.renderer.render(rootFragment, this.viewer.contentDocument.body);
    this.eventHandler.listen(vEle);
    this.invokeViewUpdatedHooks();
  }

  private invokeViewUpdatedHooks() {
    (this.options.hooks || []).forEach(lifecycle => {
      if (typeof lifecycle.onViewUpdated === 'function') {
        lifecycle.onViewUpdated();
      }
    })
  }

  private dispatchEventAndCallHooks(eventType: EventType,
                                    eventData: { [key: string]: any },
                                    callHooksFn: () => boolean): boolean {
    const focusNode = this.nativeSelection.focusNode;
    let el = focusNode.nodeType === 3 ? focusNode.parentNode : focusNode;
    const vElement = this.renderer.getVDomByNativeNode(el) as VElement;
    if (!vElement) {
      return;
    }
    const isNext = callHooksFn();
    if (isNext) {
      this.renderer.dispatchEvent(vElement, eventType, this.selection, eventData);
    }
    return isNext;
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
            p = range2.getPreviousLinePosition(this.oldCursorPosition.left);
          } else {
            const rect = range2.getRangePosition();
            this.oldCursorPosition = rect;
            p = range.getPreviousLinePosition(rect.left);
          }
          this.cleanOldCursorTimer = setTimeout(() => {
            this.oldCursorPosition = null;
          }, 3000);
          break;
        case CursorMoveDirection.Down:
          clearTimeout(this.cleanOldCursorTimer);
          range2 = range.clone().restore();

          if (this.oldCursorPosition) {
            p = range2.getNextLinePosition(this.oldCursorPosition.left);
          } else {
            const rect = range2.getRangePosition();
            this.oldCursorPosition = rect;
            p = range.getNextLinePosition(rect.left);
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

  private insertTemplate(template: Template) {
    const firstRange = this.selection.firstRange;
    const startFragment = firstRange.startFragment;
    const parentTemplate = this.renderer.getParentTemplate(startFragment);
    if (template instanceof LeafTemplate) {
      startFragment.insert(template, firstRange.endIndex);
    } else {
      if (parentTemplate instanceof BranchTemplate) {
        const parentFragment = this.renderer.getParentFragment(parentTemplate);
        const firstContent = startFragment.getContentAtIndex(0);
        parentFragment.insertAfter(template, parentTemplate);
        if (!firstContent || startFragment.contentLength === 1 && firstContent instanceof SingleTagTemplate && firstContent.tagName === 'br') {
          parentFragment.cut(parentFragment.indexOf(parentTemplate), 1);

        }
      } else if (parentTemplate instanceof BackboneTemplate && parentTemplate.canSplit()) {
        const ff = new Fragment();
        ff.append(template);
        parentTemplate.childSlots.splice(parentTemplate.childSlots.indexOf(startFragment) + 1, 0, ff);
      } else {
        startFragment.insert(template, firstRange.endIndex);
      }
    }
    this.selection.removeAllRanges();
    this.render();
    this.invokeViewUpdatedHooks();
    this.history.recordSnapshot(this.rootFragment, this.selection);
    this.recordSnapshotFromEditingBefore();
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
    if (this.snapshotSubscription) {
      this.snapshotSubscription.unsubscribe();
    }
    this.snapshotSubscription = this.onUserWrite.pipe(tap(() => {
      this.dispatchContentChangeEvent();
    })).pipe(sampleTime(5000)).subscribe(() => {
      this.history.recordSnapshot(this.rootFragment, this.selection);
      this.toolbar.updateHandlerState(this.selection, this.renderer);
    });
  }

  private static guardLastIsParagraph(fragment: Fragment) {
    const last = fragment.sliceContents(fragment.contentLength - 1)[0];
    if (last instanceof BlockTemplate) {
      if (last.tagName === 'p') {
        if (last.slot.contentLength === 0) {
          last.slot.append(new SingleTagTemplate('br'));
        }
        return;
      }
    }
    const p = new BlockTemplate('p');
    p.slot.append(new SingleTagTemplate('br'));
    fragment.append(p);
  }
}
