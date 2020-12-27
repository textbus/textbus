import { fromEvent, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { getAnnotations, Inject, Injectable } from '@tanbo/di';

import {
  Component,
  Contents,
  Parser,
  Renderer,
  TBEvent,
  TBSelection,
  TBRangePosition, TBRange, AbstractComponent, DivisionAbstractComponent
} from '../core/_api';
import { EDITABLE_DOCUMENT, EDITABLE_DOCUMENT_CONTAINER, EDITOR_SCROLL_CONTAINER } from '../editor';
import { RootComponent } from '../root-component';
import { HistoryManager } from '../history-manager';

/**
 * 快捷键配置项
 */
export interface Keymap {
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  key: string | string[];
}

export enum CursorMoveDirection {
  Left,
  Right,
  Up,
  Down
}

/**
 * 添加快捷键配置的参数
 */
export interface KeymapAction {
  /** 快捷键配置 */
  keymap: Keymap;

  /** 当触发快捷键时执行的回调 */
  action(event: Event): any;
}

export const isWindows = /win(dows|32|64)/i.test(navigator.userAgent);
export const isMac = /mac os/i.test(navigator.userAgent);

/**
 * 事件劫持类，用于分配用户鼠标和键盘操作后的逻辑
 */

@Injectable()
export class Input {
  get value() {
    return this.input.value;
  }

  get selectionStart() {
    return this.input.selectionStart;
  }

  set readonly(b: boolean) {
    this._readonly = b;
    this.input.disabled = b;
  }

  get readonly() {
    return this._readonly;
  }

  private _readonly = false;

  private input = document.createElement('textarea');
  private keymaps: KeymapAction[] = [];

  readonly elementRef = document.createElement('div');

  private cursor = document.createElement('span');
  private inputWrap = document.createElement('span');

  private timer: any = null;

  private set display(v: boolean) {
    this._display = v;
    this.cursor.style.visibility = v ? 'visible' : 'hidden';
  }

  private get display() {
    return this._display;
  }

  private _display = true;
  private flashing = true;

  private oldCursorPosition: { left: number, top: number } = null;
  private cleanOldCursorTimer: any;
  private subs: Subscription[] = [];

  constructor(@Inject(EDITABLE_DOCUMENT) private context: Document,
              @Inject(EDITABLE_DOCUMENT_CONTAINER) private container: HTMLElement,
              @Inject(EDITOR_SCROLL_CONTAINER) private scrollContainer: HTMLElement,
              private renderer: Renderer,
              private rootComponent: RootComponent,
              private parser: Parser,
              private selection: TBSelection,
              private history: HistoryManager) {
    this.container.append(this.elementRef);
    this.elementRef.classList.add('textbus-selection');
    this.cursor.classList.add('textbus-cursor');
    this.inputWrap.classList.add('textbus-input-wrap');
    this.input.classList.add('textbus-input');

    this.inputWrap.appendChild(this.input);

    this.elementRef.appendChild(this.inputWrap);
    this.elementRef.appendChild(this.cursor);

    this.init();
    this.initEvent();
    this.bindDefaultKeymap();
    this.subs.push(history.onUsed.subscribe(() => {
      this.dispatchInputReadyEvent();
    }))
  }

  /**
   * 添加快捷键
   * @param keymap
   */
  keymap(keymap: KeymapAction) {
    this.keymaps.push(keymap);
  }

  destroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  private updateStateBySelection() {
    if (this.readonly || !this.selection.rangeCount) {
      this.hide();
      return;
    }
    this.updateCursorPosition();
    if (this.selection.collapsed) {
      this.show();
    } else {
      this.hide();
    }
    this.input.focus();
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
  }

  private updateCursorPosition() {
    if (!this.selection || this.selection.rangeCount === 0) {
      return;
    }
    const startContainer = this.selection.firstRange.nativeRange.startContainer;

    const node = (startContainer.nodeType === Node.ELEMENT_NODE ? startContainer : startContainer.parentNode) as HTMLElement;
    if (node?.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const rect = this.selection.firstRange.getRangePosition();
    const {fontSize, lineHeight, color} = getComputedStyle(node);

    if (isWindows) {
      this.inputWrap.style.top = fontSize;
    }

    let height: number;
    if (isNaN(+lineHeight)) {
      const f = parseFloat(lineHeight);
      if (isNaN(f)) {
        height = parseFloat(fontSize);
      } else {
        height = f;
      }
    } else {
      height = parseFloat(fontSize) * parseFloat(lineHeight);
    }

    const boxHeight = Math.max(height, rect.height);

    let top = rect.top;
    if (rect.height < height) {
      top -= (height - rect.height) / 2;
    }

    this.elementRef.style.left = rect.left + 'px';
    this.elementRef.style.top = top + 'px';
    this.elementRef.style.height = boxHeight + 'px';
    this.cursor.style.backgroundColor = color;
    this.input.style.lineHeight = boxHeight + 'px';
    this.input.style.fontSize = fontSize;
    if (this.selection.collapsed && this.selection.rangeCount === 1) {
      const limit = this.scrollContainer;
      const scrollTop = limit.scrollTop;
      const offsetHeight = limit.offsetHeight;
      const paddingTop = parseInt(getComputedStyle(limit).paddingTop) || 0;

      const cursorTop = top + boxHeight + paddingTop + 5;
      const viewTop = scrollTop + offsetHeight;
      if (cursorTop > viewTop) {
        limit.scrollTop = cursorTop - offsetHeight;
      } else if (top < scrollTop) {
        limit.scrollTop = top;
      }
    }
  }

  private init() {
    let isWriting = false;
    this.subs.push(
      fromEvent(this.context, 'mousedown').subscribe((ev: MouseEvent) => {
        if (ev.button === 2) {
          return;
        }
        this.selection.removeAllRanges(true);
      }),
      fromEvent(this.input, 'compositionstart').subscribe(() => {
        isWriting = true;
      }),

      fromEvent(this.input, 'compositionend').subscribe(() => {
        isWriting = false;
      }),
      fromEvent(this.input, 'keydown').pipe(filter(() => {
        // 处理输入法中间状态时，按回车或其它键时，不需要触发事件
        return !isWriting || !this.input.value;
      })).subscribe((ev: KeyboardEvent) => {
        const reg = /\w+/.test(ev.key) ? new RegExp(`^${ev.key}$`, 'i') : new RegExp(`^[${ev.key.replace(/([-\\])/g, '\\$1')}]$`, 'i');
        for (const config of this.keymaps) {
          const test = Array.isArray(config.keymap.key) ?
            config.keymap.key.map(k => reg.test(k)).includes(true) :
            reg.test(config.keymap.key);
          if (test &&
            !!config.keymap.altKey === ev.altKey &&
            !!config.keymap.shiftKey === ev.shiftKey &&
            !!config.keymap.ctrlKey === (isMac ? ev.metaKey : ev.ctrlKey)) {
            ev.preventDefault();
            return config.action(ev);
          }
        }
      }),

      fromEvent(this.context, 'mousedown').subscribe(() => {
        this.flashing = false;
      }),
      fromEvent(this.context, 'mouseup').subscribe(() => {
        this.flashing = true;
      }),

      this.selection.onChange.subscribe(() => {
        this.updateStateBySelection()
      })
    );
  }

  private initEvent() {
    this.subs.push(
      fromEvent(this.input, 'blur').subscribe(() => {
        this.hide();
      }),
      fromEvent(this.input, 'focus').subscribe(() => {
        this.dispatchInputReadyEvent();
      }),
      fromEvent(this.input, 'input').subscribe(() => {
        if (!this.selection.collapsed) {
          this.dispatchEvent((component, instance) => {
            const event = new TBEvent(instance);
            component.interceptor?.onDeleteRange?.(event)
            return !event.stopped;
          })
          this.dispatchInputReadyEvent(true);
        }
        if (this.selection.collapsed) {
          this.dispatchEvent((component, instance) => {
            const event = new TBEvent(instance);
            component.interceptor?.onInput?.(event);
            return !event.stopped;
          })
        }
      }),
      fromEvent(this.input, 'paste').subscribe((ev: ClipboardEvent) => {
        const text = ev.clipboardData.getData('Text');
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
          (fragment.getContentAtIndex(0) as DivisionAbstractComponent).slot.sliceContents(0).forEach(i => {
            contents.append(i)
          });
          document.body.removeChild(div);

          if (!this.selection.collapsed) {
            this.dispatchEvent((component, instance) => {
              const event = new TBEvent(instance);
              component.interceptor?.onDeleteRange?.(event);
              return !event.stopped;
            })
          }
          if (this.selection.collapsed) {
            this.dispatchEvent((component, instance) => {
              const event = new TBEvent(instance, {contents, text});
              component.interceptor?.onPaste?.(event);
              return !event.stopped;
            })
          }
          this.dispatchInputReadyEvent();
        });
      }),
      fromEvent(this.input, 'copy').subscribe(() => {
        this.context.execCommand('copy');
      }),
      fromEvent(this.input, 'cut').subscribe(() => {
        this.context.execCommand('copy');
        this.selection.ranges.forEach(range => {
          range.connect();
        });
        this.dispatchInputReadyEvent();
      })
    );
  }

  private bindDefaultKeymap() {
    this.keymap({
      keymap: {
        key: ['Backspace', 'Delete']
      },
      action: () => {
        if (this.selection.collapsed) {
          this.dispatchEvent((component, instance) => {
            const event = new TBEvent(instance);
            component.interceptor?.onDelete?.(event)
            return !event.stopped;
          })
        } else {
          this.dispatchEvent((component, instance) => {
            const event = new TBEvent(instance);
            component.interceptor?.onDeleteRange?.(event)
            return !event.stopped;
          })
        }
        this.dispatchInputReadyEvent()
      }
    })
    this.keymap({
      keymap: {
        key: 'Enter'
      },
      action: () => {
        if (!this.selection.collapsed) {
          this.dispatchEvent((component, instance) => {
            const event = new TBEvent(instance);
            component.interceptor?.onDeleteRange?.(event);
            return !event.stopped;
          })
        }
        if (this.selection.collapsed) {
          this.dispatchEvent((component, instance) => {
            const event = new TBEvent(instance);
            component.interceptor?.onEnter?.(event)
            return !event.stopped;
          })
        }
        this.dispatchInputReadyEvent()
      }
    })
    this.keymap({
      keymap: {
        key: 'a',
        ctrlKey: true
      },
      action: () => {
        const selection = this.selection;
        const firstRange = selection.firstRange;
        const firstPosition = firstRange.findFirstPosition(this.rootComponent.slot);
        const lastPosition = firstRange.findLastChild(this.rootComponent.slot);
        selection.removeAllRanges();

        firstRange.setStart(firstPosition.fragment, firstPosition.index);
        firstRange.setEnd(lastPosition.fragment, lastPosition.index);

        selection.addRange(firstRange);
        selection.restore();
      }
    })
    this.keymap({
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
        this.dispatchInputReadyEvent();
      }
    })
  }

  private dispatchInputReadyEvent(keepInputContent = false) {
    if (!keepInputContent) {
      this.input.value = '';
    }
    if (this.selection.collapsed && this.selection.rangeCount === 1) {
      this.dispatchEvent(component => {
        component.interceptor?.onInputReady?.();
        return true;
      })
    }
  }

  private dispatchEvent(invokeFn: (component: Component, instance: AbstractComponent) => boolean) {
    let component = this.selection.commonAncestorFragment?.parentComponent;
    while (component) {
      const annotations = getAnnotations(component.constructor);
      const componentAnnotation = annotations.getClassMetadata(Component);
      const params = componentAnnotation.params[0] as Component;
      if (!invokeFn(params, component)) {
        break;
      }
      component = component.parentFragment?.parentComponent;
    }
  }

  private show() {
    this.display = true;
    clearTimeout(this.timer);
    const toggleShowHide = () => {
      this.display = !this.display || !this.flashing;
      this.timer = setTimeout(toggleShowHide, 400);
    };
    this.timer = setTimeout(toggleShowHide, 400);
  }

  private hide() {
    this.display = false;
    clearTimeout(this.timer);
  }
}
