import { auditTime, distinctUntilChanged, filter, map, sampleTime, tap } from 'rxjs/operators';
import { from, fromEvent, merge, Observable, of, Subject, Subscription, zip } from 'rxjs';
import pretty from 'pretty';

import {
  BranchComponent,
  Commander,
  Component,
  ComponentReader,
  Contents,
  DivisionComponent,
  EventType,
  Formatter,
  Fragment,
  LeafComponent,
  Lifecycle,
  Parser,
  Renderer,
  TBRange,
  TBRangePosition,
  TBSelection,
  VElement
} from './core/_api';
import { Viewer } from './viewer/viewer';
import { HighlightState, Toolbar, ToolConfig, ToolFactory } from './toolbar/_api';
import { BlockComponent, BrComponent, PreComponent } from './components/_api';
import { KeymapAction } from './viewer/input';
import { StatusBar } from './status-bar/status-bar';
import { ComponentExample } from './workbench/component-stage';
import { EventHandler } from './event-handler';
import { Workbench } from './workbench/workbench';
import { HistoryManager } from './history-manager';
import { FileUploader } from './uikit/forms/help';

/**
 * TextBus 初始化时的配置参数
 */
export interface EditorOptions {
  /** 设置主题 */
  theme?: string;
  /** 设备宽度 */
  deviceWidth?: string;
  /** 默认是否全屏*/
  fullScreen?: boolean;
  /** 默认是否展开组件库 */
  expandComponentLibrary?: boolean;
  /** 设置最大历史栈 */
  historyStackSize?: number;
  /** 设置组件读取转换器 */
  componentReaders?: ComponentReader[];
  /** 设置格式转换器 */
  formatters?: Formatter[];
  /** 工具条配置 */
  toolbar?: (ToolFactory | ToolFactory[])[];
  /** 配置生命周期勾子 */
  hooks?: Lifecycle[];
  /** 配置文档的默认样式 */
  styleSheets?: string[];
  /** 配置文档编辑状态下用到的样式 */
  editingStyleSheets?: string[];
  /** 设置初始化 TextBus 时的默认内容 */
  contents?: string;
  /** 设置可选的自定义组件 */
  componentLibrary?: ComponentExample[];

  /** 当某些工具需要上传资源时的调用函数，调用时会传入上传资源的类型，如 image、video、audio等，该函数返回一个字符串，作为资源的 url 地址 */
  uploader?(type: string): (string | Promise<string> | Observable<string>);
}

/**
 * 方向键标识
 */
export enum CursorMoveDirection {
  Left,
  Right,
  Up,
  Down
}

/**
 * TextBus 主类
 */
export class Editor implements FileUploader {
  /** 当 TextBus 可用时触发 */
  readonly onReady: Observable<void>;
  /** 当 TextBus 内容发生变化时触发 */
  readonly onChange: Observable<void>;
  /** 当 TextBus 历史记录管理器 */
  readonly history: HistoryManager;

  readonly elementRef = document.createElement('div');

  private readonly container: HTMLElement;

  private workbench: Workbench;
  private viewer: Viewer;
  private parser: Parser;
  private toolbar: Toolbar;
  private renderer = new Renderer();
  private statusBar = new StatusBar();

  private readyState = false;
  private openSourceCodeModel = false;
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
  private contentUnexpectedlyChangedSub: Subscription;

  private sourceCodeComponent = new PreComponent('html');

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
    this.parser = new Parser(options.componentReaders, options.formatters);
    this.viewer = new Viewer([...(options.styleSheets || []), ...(options.editingStyleSheets || [])]);
    this.workbench = new Workbench(this.viewer, this);
    this.toolbar = new Toolbar(this, this, this.workbench, options.toolbar);
    let deviceWidth = options.deviceWidth || '100%';

    this.statusBar.libSwitch.expand = this.options.expandComponentLibrary;
    if (!this.options.componentLibrary?.length) {
      this.statusBar.libSwitch.elementRef.style.display = 'none';
    }

    this.statusBar.device.update(deviceWidth);
    this.statusBar.fullScreen.full = this.options.fullScreen;

    this.statusBar.fullScreen.full ? this.elementRef.classList.add('textbus-container-full-screen') : this.elementRef.classList.remove('textbus-container-full-screen');

    this.workbench.setTabletWidth(deviceWidth);
    this.workbench.componentStage.expand = this.options.expandComponentLibrary;

    if (Array.isArray(options.componentLibrary)) {
      options.componentLibrary.forEach(i => this.workbench.componentStage.addExample(i));
    }

    this.subs.push(
      this.statusBar.libSwitch.onSwitch.subscribe(b => {
        this.workbench.componentStage.expand = b;
      }),
      this.workbench.componentStage.onCheck.subscribe(component => {
        if (this.selection && this.selection.rangeCount) {
          this.insertComponent(component);
        }
      }),
      this.statusBar.device.onChange.subscribe(value => {
        deviceWidth = value;
        this.workbench.setTabletWidth(value);
        this.invokeViewUpdatedHooks();
      }),
      this.statusBar.editingModel.onChange.subscribe(b => {
        this.openSourceCodeModel = b;
        if (this.readyState) {
          this.selection.removeAllRanges();
          this.statusBar.libSwitch.disabled = b;
          this.viewer.sourceCodeModel = b;
          if (b) {
            if (this.snapshotSubscription) {
              this.snapshotSubscription.unsubscribe();
            }
            const html = this.renderer.renderToHTML(this.rootFragment);
            this.rootFragment.clean();
            this.sourceCodeComponent.slot.clean();
            this.sourceCodeComponent.slot.append(pretty(html));
            this.rootFragment.append(this.sourceCodeComponent);
            this.render();
          } else {
            const html = this.getHTMLBySourceCodeModel();
            this.writeContents(html).then(dom => {
              this.rootFragment = this.parser.parse(dom);
              this.render();
              this.history.recordSnapshot(this.rootFragment, this.selection);
              this.listenUserWriteEvent();
            })
          }
        }
      }),
      this.statusBar.fullScreen.onChange.subscribe(b => {
        b ? this.elementRef.classList.add('textbus-container-full-screen') : this.elementRef.classList.remove('textbus-container-full-screen');

        this.workbench.setTabletWidth(deviceWidth);
        this.invokeViewUpdatedHooks();
      }),
      zip(from(this.writeContents(options.contents || this.defaultHTML)), this.viewer.onReady).subscribe(result => {
        this.rootFragment = this.parser.parse(result[0]);
        this.render();
        this.nativeSelection = this.viewer.contentDocument.getSelection();
        this.selection = new TBSelection(this.viewer.contentDocument, this.renderer);
        this.readyState = true;
        this.setup();
        this.readyEvent.next();
        this.workbench.loaded();
      })
    );

    this.elementRef.appendChild(this.toolbar.elementRef);
    this.elementRef.appendChild(this.workbench.elementRef);
    this.elementRef.append(this.statusBar.elementRef);
    this.elementRef.classList.add('textbus-container');

    if (options.theme) {
      this.elementRef.classList.add('textbus-theme-' + options.theme);
    }
    this.container.appendChild(this.elementRef);

    this.listenUserWriteEvent();

  }

  /**
   * 设置 TextBus 编辑器的内容。
   * @param html
   */
  setContents(html: string) {
    this.run(() => {
      this.writeContents(html).then(el => {
        this.rootFragment = this.parser.parse(el);
        this.render();
      });
    })
  }

  upload(type: string): Observable<string> {
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

  /**
   * 获取 TextBus 的内容。
   */
  getContents() {
    return {
      styleSheets: this.options.styleSheets,
      html: this.openSourceCodeModel ? this.getHTMLBySourceCodeModel() : this.renderer.renderToHTML(this.rootFragment)
    };
  }

  /**
   * 获取 TextBus 内容的 JSON 字面量。
   */
  getJSONLiteral() {
    if (this.openSourceCodeModel) {
      throw new Error('源代码模式下，不支持获取 JSON 字面量！');
    }
    return {
      styleSheets: this.options.styleSheets,
      json: this.renderer.renderToJSON(this.rootFragment)
    };
  }

  /**
   * 注册快捷键。
   * @param action
   */
  registerKeymap(action: KeymapAction) {
    this.run(() => {
      this.viewer.input.keymap(action);
    });
  }

  /**
   * 销毁 TextBus 实例。
   */
  destroy() {
    this.container.removeChild(this.elementRef);
    this.subs.forEach(s => s.unsubscribe());
    if (this.contentUnexpectedlyChangedSub) {
      this.contentUnexpectedlyChangedSub.unsubscribe();
    }
    this.readyEvent.complete();
    this.changeEvent.complete();
    this.history.destroy();
  }

  private setup() {
    fromEvent(this.viewer.contentDocument, 'mousedown').subscribe((ev: MouseEvent) => {
      this.oldCursorPosition = null;
      clearTimeout(this.cleanOldCursorTimer);
      if (ev.button === 2) {
        return;
      }
      this.nativeSelection.removeAllRanges();
    });

    (this.options.hooks || []).forEach(hooks => {
      if (typeof hooks.setup === 'function') {
        hooks.setup(this.renderer,
          this.viewer.contentDocument,
          this.viewer.contentWindow,
          this.workbench.tablet);
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
        this.viewer.input.updateStateBySelection(this.selection, this.workbench.tablet.parentNode as HTMLElement);
      }), auditTime(100), tap(() => {
        const event = document.createEvent('Event');
        event.initEvent('click', true, true);
        this.elementRef.dispatchEvent(event);
        this.toolbar.updateHandlerState(this.selection, this.renderer, this.openSourceCodeModel);
      }), map(() => {
        return this.nativeSelection.focusNode;
      }), filter(b => !!b), distinctUntilChanged()).subscribe(node => {
        const vEle = this.renderer.getVDomByNativeNode(node.nodeType === 3 ? node.parentNode : node) as VElement;
        if (vEle) {
          this.renderer.dispatchEvent(vEle, EventType.onFocus, this.selection);
        }
        this.statusBar.paths.update(node);
      }),
      this.toolbar.onAction.subscribe(config => {
        if (this.selection) {
          this.apply(config.config, config.params, config.instance.commander);
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

        const data = {
          selectionSnapshot: this.selectionSnapshot,
          fragmentSnapshot: this.fragmentSnapshot,
          input: this.viewer.input
        };
        this.dispatchEventAndCallHooks(EventType.onInput, data, () => {
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
              data.fragmentSnapshot = this.fragmentSnapshot;
              data.selectionSnapshot = this.selectionSnapshot;
            }
          }
          return isNext;
        })
        const focusNode = this.nativeSelection.focusNode;
        let el = focusNode.nodeType === Node.TEXT_NODE ? focusNode.parentNode : focusNode;
        const vElement = this.renderer.getVDomByNativeNode(el) as VElement;
        if (!vElement) {
          return;
        }
        this.userWriteEvent.next();
        this.render();
        this.selection.restore();
        this.viewer.input.updateStateBySelection(this.selection, this.workbench.tablet.parentNode as HTMLElement);
      }),
      this.viewer.input.events.onPaste.subscribe(() => {
        const div = document.createElement('div');
        div.style.cssText = 'width:10px; height:10px; overflow: hidden; position: fixed; left: -9999px';
        div.contentEditable = 'true';
        document.body.appendChild(div);
        div.focus();
        setTimeout(() => {
          let html = div.innerHTML;
          let hasEmpty = true;
          const reg = /<(?!(?:td|th))(\w+)[^>]*?>\s*?<\/\1>/g;
          while (hasEmpty) {
            hasEmpty = false;
            html = html.replace(reg, function () {
              hasEmpty = true;
              return '';
            });
          }
          div.innerHTML = html;

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
        this.viewer.input.updateStateBySelection(this.selection, this.workbench.tablet.parentNode as HTMLElement);
        this.recordSnapshotFromEditingBefore();
        this.userWriteEvent.next();
      }
    })
    this.viewer.input.events.addKeymap({
      keymap: {
        key: ['Backspace', 'Delete']
      },
      action: () => {
        const focusNode = this.nativeSelection.focusNode;
        let el = focusNode.nodeType === Node.TEXT_NODE ? focusNode.parentNode : focusNode;
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
        const isEmpty = this.rootFragment.contentLength === 0;
        const firstRange = selection.firstRange;
        this.render();
        if (isEmpty) {
          const position = firstRange.findFirstPosition(this.rootFragment);
          firstRange.setStart(position.fragment, position.index);
          firstRange.collapse();
        }
        selection.restore();
        this.viewer.input.updateStateBySelection(this.selection, this.workbench.tablet.parentNode as HTMLElement);
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

  private apply(config: ToolConfig, params: any, commander: Commander) {
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
        lifecycle.onApplyCommand(commander, selection, this, this.rootFragment, params, newParams => {
          params = newParams;
        }) === false) {
        isNext = false;
      }
    })
    if (isNext) {
      commander.command(selection, params, overlap, this.renderer, this.rootFragment);
      this.render();
      selection.restore();
      // this.toolbar.updateHandlerState(selection, this.renderer, this.openSourceCodeModel);
    }
  }

  private render() {
    let isNext = true;
    (this.options.hooks || []).forEach(lifecycle => {
      if (typeof lifecycle.onRenderingBefore === 'function' &&
        lifecycle.onRenderingBefore(this.renderer, this.selection, this, this.rootFragment) === false) {
        isNext = false;
      }
    })
    if (!isNext) {
      return;
    }

    if (this.contentUnexpectedlyChangedSub) {
      this.contentUnexpectedlyChangedSub.unsubscribe();
    }
    const rootFragment = this.rootFragment;

    if (this.openSourceCodeModel) {
      Editor.guardContentIsPre(rootFragment, this.sourceCodeComponent);
    } else {
      Editor.guardLastIsParagraph(rootFragment);
    }
    const vEle = this.renderer.render(rootFragment, this.viewer.contentDocument.body);
    this.eventHandler.listen(vEle);
    this.contentUnexpectedlyChangedSub = vEle.events.subscribe(ev => {
      if (ev.type === EventType.onContentUnexpectedlyChanged) {
        this.render();
      }
    })
    this.invokeViewUpdatedHooks();
    if (this.readyState) {
      this.dispatchContentChangeEvent();
    }
  }

  private invokeViewUpdatedHooks() {
    (this.options.hooks || []).forEach(lifecycle => {
      if (typeof lifecycle.onViewUpdated === 'function') {
        lifecycle.onViewUpdated(this.renderer, this.selection, this, this.rootFragment, this.workbench.tablet);
      }
    })
  }

  private dispatchEventAndCallHooks(eventType: EventType,
                                    eventData: { [key: string]: any },
                                    callHooksFn: () => boolean): boolean {
    const focusNode = this.nativeSelection.focusNode;
    let el = focusNode.nodeType === Node.TEXT_NODE ? focusNode.parentNode : focusNode;
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

  private insertComponent(component: Component) {
    const firstRange = this.selection.firstRange;
    const startFragment = firstRange.startFragment;
    const parentComponent = this.renderer.getParentComponent(startFragment);
    if (component instanceof LeafComponent) {
      startFragment.insert(component, firstRange.endIndex);
    } else {
      if (parentComponent instanceof DivisionComponent) {
        const parentFragment = this.renderer.getParentFragment(parentComponent);
        const firstContent = startFragment.getContentAtIndex(0);
        parentFragment.insertAfter(component, parentComponent);
        if (!firstContent || startFragment.contentLength === 1 && firstContent instanceof BrComponent) {
          parentFragment.cut(parentFragment.indexOf(parentComponent), 1);

        }
      } else if (parentComponent instanceof BranchComponent) {
        const ff = new Fragment();
        ff.append(component);
        parentComponent.slots.splice(parentComponent.slots.indexOf(startFragment) + 1, 0, ff);
      } else {
        startFragment.insert(component, firstRange.endIndex);
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
      const loadedId = 'loadedID' + Math.random();
      const src = `javascript:void((function () {
                      document.open();
                      document.domain=\'${document.domain}\';
                      document.write('<script>document.addEventListener(\\\'DOMContentLoaded\\\', function(){window.parent.postMessage(\\\'${loadedId}\\\', \\\'${location.origin}\\\')})</script>');
                      document.write('${html.replace(/[']/g, '\\\'')}');
                      document.close();
                    })())`;

      const onMessage = (ev: MessageEvent) => {
        if (ev.data === loadedId) {
          window.removeEventListener('message', onMessage);
          const body = temporaryIframe.contentDocument.body;
          document.body.removeChild(temporaryIframe);
          resolve(body);
        }
      }

      window.addEventListener('message', onMessage);
      temporaryIframe.style.cssText =
        'position: absolute;' +
        'left: -9999px;' +
        'top: -9999px;' +
        'width:0;' +
        'height:0;' +
        'opacity:0';
      temporaryIframe.src = src;

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
    this.snapshotSubscription = this.onUserWrite.pipe(sampleTime(5000)).subscribe(() => {
      this.history.recordSnapshot(this.rootFragment, this.selection);
    });
  }

  private getHTMLBySourceCodeModel() {
    return this.sourceCodeComponent.slot.sliceContents(0).map(i => {
      return typeof i === 'string' ? i.trim() : '';
    }).join('');
  }

  private static guardLastIsParagraph(fragment: Fragment) {
    const last = fragment.sliceContents(fragment.contentLength - 1)[0];
    if (last instanceof BlockComponent) {
      if (last.tagName === 'p') {
        if (last.slot.contentLength === 0) {
          last.slot.append(new BrComponent());
        }
        return;
      }
    }
    const p = new BlockComponent('p');
    p.slot.append(new BrComponent());
    fragment.append(p);
  }

  private static guardContentIsPre(fragment: Fragment, pre: PreComponent) {
    if (fragment.contentLength === 0) {
      fragment.append(pre);
    }
    if (pre.slot.contentLength === 0) {
      pre.slot.append(new BrComponent());
    }
  }
}
