import { fromEvent, Subscription } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { Inject, Injectable, InjectFlags, Injector, Type } from '@tanbo/di';

import {
  AbstractComponent,
  ComponentSetter,
  ContextMenuAction, DivisionAbstractComponent,
  Interceptor,
  LeafAbstractComponent,
  Parser,
  Renderer,
  TBEvent,
  TBSelection,
  KeymapAction, DynamicKeymap
} from '../core/_api';
import { EDITABLE_DOCUMENT, EDITABLE_DOCUMENT_CONTAINER, EDITOR_SCROLL_CONTAINER } from '../editor';
import { RootComponent } from '../root-component';
import { HistoryManager } from '../history-manager';
import { EditorController } from '../editor-controller';
import { ControlPanel } from './control-panel';
import { createElement, createTextNode } from '../uikit/uikit';
import { ComponentInjectors } from '../component-injectors';

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
    this.hide();
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
  private subs: Subscription[] = [];

  private contextmenu: ContextMenu;

  private prevComponent: AbstractComponent = null;

  constructor(@Inject(EDITABLE_DOCUMENT) private context: Document,
              @Inject(EDITABLE_DOCUMENT_CONTAINER) private container: HTMLElement,
              @Inject(EDITOR_SCROLL_CONTAINER) private scrollContainer: HTMLElement,
              private controlPanel: ControlPanel,
              private editorController: EditorController,
              private componentInjectors: ComponentInjectors,
              private renderer: Renderer,
              private rootComponent: RootComponent,
              private parser: Parser,
              private selection: TBSelection,
              private history: HistoryManager) {
    this.contextmenu = new ContextMenu(this.history);
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
    this.subs.push(editorController.onStateChange.pipe(map(i => i.readonly)).subscribe(b => {
      this.readonly = b;
    }))
  }

  /**
   * 添加快捷键
   * @param keymap
   */
  addKeymap(keymap: KeymapAction) {
    this.keymaps.unshift(keymap);
  }

  destroy() {
    this.contextmenu.destroy();
    this.subs.forEach(s => s.unsubscribe());
  }

  private updateStateBySelection() {
    if (this.readonly || !this.selection.rangeCount) {
      this.hide();
      return;
    }
    if (this.selection.collapsed) {
      const startContainer = this.selection.firstRange.nativeRange.startContainer;
      const position = this.renderer.getPositionByNode(startContainer);
      if (!position || position && startContainer.nodeType === Node.ELEMENT_NODE && startContainer.childNodes.length === 0) {
        this.hide();
        return;
      }
    }
    this.updateCursorPosition();
    if (this.selection.collapsed) {
      this.show();
    } else {
      this.hide();
    }
    this.input.focus();
  }


  private updateCursorPosition() {
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
        this.contextmenu.hide();
        this.selection.removeAllRanges(true);
      }),
      fromEvent(this.context, 'contextmenu').subscribe((ev: MouseEvent) => {
        const selection = this.context.getSelection();
        const focusNode = selection.focusNode;
        const offset = selection.focusOffset;
        const isCollapsed = selection.isCollapsed;
        setTimeout(() => {
          if (isCollapsed) {
            if (!selection.isCollapsed) {
              selection.collapse(focusNode, offset);
            }
          }
        })
        const rect = this.container.getBoundingClientRect();
        this.contextmenu.show([
          [{
            iconClasses: ['textbus-icon-copy'],
            label: '复制',
            disabled: this.selection.collapsed,
            action: () => {
              this.copy();
            }
          }, {
            iconClasses: ['textbus-icon-paste'],
            label: '粘贴',
            // disabled: true,
            action: () => {
              this.paste();
            }
          }, {
            iconClasses: ['textbus-icon-cut'],
            label: '剪切',
            disabled: this.selection.collapsed,
            action: () => {
              this.cut();
              this.history.record();
            }
          }, {
            iconClasses: ['textbus-icon-select'],
            label: '全选',
            action: () => {
              this.selection.selectAll();
            }
          }],
          ...this.makeContextmenu()
        ], ev.pageX + rect.x, ev.pageY + rect.y);
        ev.preventDefault();
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
        let hasMatched = false;
        const invokeKeymaps = (keymaps: KeymapAction[]) => {
          for (const config of keymaps) {
            const test = Array.isArray(config.keymap.key) ?
              config.keymap.key.map(k => reg.test(k)).includes(true) :
              reg.test(config.keymap.key);
            if (test &&
              !!config.keymap.altKey === ev.altKey &&
              !!config.keymap.shiftKey === ev.shiftKey &&
              !!config.keymap.ctrlKey === (isMac ? ev.metaKey : ev.ctrlKey)) {
              hasMatched = true;
              this.dispatchInputReadyEvent();
              config.action(ev);
              this.dispatchInputReadyEvent();
              break;
            }
          }
        }

        this.dispatchEvent((injector, instance) => {
          const dynamicKeymap = injector.get(DynamicKeymap as Type<DynamicKeymap<any>>, null, InjectFlags.Self);
          if (dynamicKeymap) {
            const keymapActions = dynamicKeymap.provide(instance);
            invokeKeymaps(keymapActions);
            if (hasMatched) {
              return false;
            }
          }
          return true;
        })

        if (!hasMatched) {
          invokeKeymaps(this.keymaps);
        }
        if (hasMatched) {
          ev.preventDefault();
          return false
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
        this.dispatchComponentPresetEvent();
      })
    );
  }

  private makeContextmenu() {
    let component = this.selection.commonAncestorComponent;
    if (!component) {
      return [];
    }
    const actionGroups: ContextMenuAction[][] = [];
    while (component) {
      const injector = this.componentInjectors.get(component.constructor as Type<AbstractComponent>);
      const interceptor = injector.get(Interceptor as Type<Interceptor<any>>, null, InjectFlags.Self);
      const v = interceptor?.onContextmenu?.(component);

      if (v) {
        actionGroups.push(v);
      }
      component = component.parentFragment?.parentComponent;
    }
    return actionGroups;
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
          this.dispatchEvent((injector, instance) => {
            const event = new TBEvent(instance);
            const interceptor = injector.get(Interceptor as Type<Interceptor<any>>, null, InjectFlags.Self);
            if (interceptor) {
              interceptor.onDeleteRange?.(event);
            }
            return !event.stopped;
          })
          this.dispatchInputReadyEvent(true);
        }
        if (this.selection.collapsed) {
          this.dispatchEvent((injector, instance) => {
            const event = new TBEvent(instance);
            const interceptor = injector.get(Interceptor as Type<Interceptor<any>>, null, InjectFlags.Self);
            if (interceptor) {
              interceptor.onInput?.(event);
            }
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
          this.handlePaste(div, text);

          document.body.removeChild(div);
          this.history.record();
        });
      }),
      fromEvent(this.input, 'copy').subscribe(() => {
        this.copy();
      }),
      fromEvent(this.input, 'cut').subscribe(() => {
        this.cut();
        this.history.record();
      })
    );
  }

  private bindDefaultKeymap() {
    this.addKeymap({
      keymap: {
        key: ['Backspace', 'Delete']
      },
      action: () => {
        if (this.selection.collapsed) {
          this.dispatchEvent((injector, instance) => {
            const event = new TBEvent(instance);
            const interceptor = injector.get(Interceptor as Type<Interceptor<any>>, null, InjectFlags.Self);
            if (interceptor) {
              interceptor.onDelete?.(event);
            }
            return !event.stopped;
          })
        } else {
          this.dispatchEvent((injector, instance) => {
            const event = new TBEvent(instance);
            const interceptor = injector.get(Interceptor as Type<Interceptor<any>>, null, InjectFlags.Self);
            if (interceptor) {
              interceptor.onDeleteRange?.(event);
            }
            return !event.stopped;
          })
        }
        this.dispatchInputReadyEvent()
      }
    })
    this.addKeymap({
      keymap: {
        key: 'Enter'
      },
      action: () => {
        if (!this.selection.collapsed) {
          this.dispatchEvent((injector, instance) => {
            const event = new TBEvent(instance);
            const interceptor = injector.get(Interceptor as Type<Interceptor<any>>, null, InjectFlags.Self);
            if (interceptor) {
              interceptor.onDeleteRange?.(event);
            }
            return !event.stopped;
          })
        }
        if (this.selection.collapsed) {
          this.dispatchEvent((injector, instance) => {
            const event = new TBEvent(instance);
            const interceptor = injector.get(Interceptor as Type<Interceptor<any>>, null, InjectFlags.Self);
            if (interceptor) {
              interceptor.onEnter?.(event);
            }
            return !event.stopped;
          })
        }
        this.dispatchInputReadyEvent()
      }
    })
    this.addKeymap({
      keymap: {
        key: 'a',
        ctrlKey: true
      },
      action: () => {
        this.selection.selectAll();
      }
    })
    this.addKeymap({
      keymap: {
        key: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
      },
      action: (ev: KeyboardEvent) => {
        switch (ev.key) {
          case 'ArrowLeft':
            this.selection.toPrevious();
            break;
          case 'ArrowRight':
            this.selection.toNext();
            break;
          case 'ArrowUp':
            this.selection.toPreviousLine();
            break;
          case 'ArrowDown':
            this.selection.toNextLine();
            break;
        }
        this.dispatchInputReadyEvent();
      }
    })
    this.addKeymap({
      keymap: {
        key: 'z',
        ctrlKey: true
      },
      action: () => {
        this.history.usePreviousSnapshot();
      }
    })
    this.addKeymap({
      keymap: {
        key: 'z',
        ctrlKey: true,
        shiftKey: true
      },
      action: () => {
        this.history.useNextSnapshot();
      }
    })
    this.addKeymap({
      keymap: {
        key: 'Home'
      },
      action: () => {
        // 通过不断向前移动光标，并根据光标纵坐标是否改变来判断是否找到了当前行第一个光标位置
        let currentRangePosition = this.selection.firstRange.getRangePosition();
        while (true) {
          this.selection.toPrevious();
          const previousRangePosition = this.selection.firstRange.getRangePosition();
          if (Math.abs(currentRangePosition.bottom - previousRangePosition.bottom) > 5) {
            this.selection.toNext();
            break;
          }
          // 避免光标在文档第一行时死循环
          else if (previousRangePosition.left === currentRangePosition.left && previousRangePosition.top === currentRangePosition.top) {
            break;
          }
          currentRangePosition = previousRangePosition;
        }
      }
    })
    this.addKeymap({
      keymap: {
        key: 'End'
      },
      action: () => {
        // 通过不断向后移动光标，并根据光标纵坐标是否改变来判断是否找到了当前行最后一个光标位置
        let currentRangePosition = this.selection.firstRange.getRangePosition();
        while (true) {
          this.selection.toNext();
          const nextRangePosition = this.selection.firstRange.getRangePosition();
          if (Math.abs(currentRangePosition.bottom - nextRangePosition.bottom) > 5) {
            this.selection.toPrevious();
            break;
          }
          // 避免光标在文档最后一行时死循环
          else if (currentRangePosition.left === nextRangePosition.left && currentRangePosition.top === nextRangePosition.top) {
            break;
          }
          currentRangePosition = nextRangePosition;
        }
      }
    })
  }

  private dispatchComponentPresetEvent() {
    let component = this.selection.commonAncestorComponent;
    if (!component) {
      this.controlPanel.showPanels([]);
      return;
    }
    const views = [];

    const createView = (component: AbstractComponent) => {
      const injector = this.componentInjectors.get(component.constructor as Type<AbstractComponent>);
      const setter = injector.get(ComponentSetter as Type<ComponentSetter<any>>, null, InjectFlags.Self);
      if (setter) {
        return setter.create(component);
      }
      return null;
    }

    if (this.selection.collapsed) {
      const firstRange = this.selection.firstRange;
      const prevContent = firstRange.startFragment.getContentAtIndex(firstRange.startIndex - 1);
      if (prevContent instanceof LeafAbstractComponent) {
        component = prevContent;
      }
    }
    if (component === this.prevComponent) {
      return;
    }
    this.prevComponent = component;
    while (component) {
      const v = createView(component);
      if (v) {
        views.push(v);
      }
      component = component.parentFragment?.parentComponent;
    }
    this.controlPanel.showPanels(views);
  }

  private dispatchInputReadyEvent(keepInputContent = false) {
    if (!keepInputContent) {
      this.input.value = '';
    }
    if (this.selection.collapsed && this.selection.rangeCount === 1) {
      this.dispatchEvent((injector, instance) => {
        const event = new TBEvent(instance);
        const interceptor = injector.get(Interceptor as Type<Interceptor<any>>, null, InjectFlags.Self);
        if (interceptor) {
          interceptor.onInputReady?.(event);
        }
        return !event.stopped;
      })
    }
  }

  private handlePaste(dom: HTMLElement, text: string) {
    const fragment = (this.parser.parse(dom).getContentAtIndex(0) as DivisionAbstractComponent).slot;
    if (!this.selection.collapsed) {
      this.dispatchEvent((injector, instance) => {
        const event = new TBEvent(instance);
        const interceptor = injector.get(Interceptor as Type<Interceptor<any>>, null, InjectFlags.Self);
        if (interceptor) {
          interceptor.onDeleteRange?.(event);
        }
        return !event.stopped;
      })
    }
    if (this.selection.collapsed) {
      this.dispatchEvent((injector, instance) => {
        const event = new TBEvent(instance, {fragment, text});
        const interceptor = injector.get(Interceptor as Type<Interceptor<any>>, null, InjectFlags.Self);
        if (interceptor) {
          interceptor.onPaste?.(event);
        }
        return !event.stopped;
      })
    }
    this.dispatchInputReadyEvent();
  }

  private dispatchEvent(invokeFn: (injector: Injector, instance: AbstractComponent) => boolean) {
    let component = this.selection.commonAncestorComponent;
    while (component) {
      const injector = this.componentInjectors.get(component.constructor as Type<AbstractComponent>);
      if (!invokeFn(injector, component)) {
        break;
      }
      component = component.parentFragment?.parentComponent;
    }
  }

  private paste() {
    navigator.permissions.query({name: 'clipboard-write'} as any).then((result) => {
      if (result.state === 'granted') {
        (navigator.clipboard as any).read().then((items: any[]) => {
          const item = items[0];
          item.types.filter((i: string) => i === 'text/html').forEach((type: string) => {
            (item.getType(type) as Promise<Blob>).then(blob => {
              return blob.text()
            }).then(text => {
              const div = document.createElement('div');
              div.innerHTML = text;
              this.handlePaste(div, div.innerText);
              this.history.record();
            });
          })
        })
      } else {
        alert('没有剪切板读取权限！')
      }
    })
  }

  private cut() {
    this.context.execCommand('copy');
    this.selection.ranges.forEach(range => {
      range.deleteContents();
    });

    this.dispatchInputReadyEvent();
  }

  private copy() {
    this.context.execCommand('copy');
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

class ContextMenu {
  private elementRef: HTMLElement;

  private eventFromSelf = false;

  private subs: Subscription[] = [];

  constructor(private history: HistoryManager) {
    this.elementRef = createElement('div', {
      classes: ['textbus-contextmenu']
    })
    this.elementRef.addEventListener('click', () => {
      this.hide();
    })
    this.elementRef.addEventListener('contextmenu', ev => ev.preventDefault());

  }

  hide() {
    this.subs.forEach(i => i.unsubscribe());
    this.subs = [];
    this.elementRef.parentNode?.removeChild(this.elementRef);
  }

  show(menus: ContextMenuAction[][], x: number, y: number) {
    this.subs.push(
      fromEvent(document, 'mousedown').subscribe(() => {
        if (!this.eventFromSelf) {
          this.hide();
        }
      }),
      fromEvent(window, 'resize').subscribe(() => {
        setPosition();
      })
    )
    this.elementRef.innerHTML = '';

    const setPosition = () => {
      const clientWidth = document.documentElement.clientWidth;
      const clientHeight = document.documentElement.clientHeight;
      if (x + menuWidth >= clientWidth) {
        x -= menuWidth
      }
      if (y + menuHeight >= clientHeight - 20) {
        y = clientHeight - menuHeight - 20;
      }

      if (y < 20) {
        y = 20;
      }
      Object.assign(this.elementRef.style, {
        left: x + 'px',
        top: y + 'px'
      })
      this.elementRef.style.maxHeight = clientHeight - y - 20 + 'px';
    }


    let itemCount = 0;
    menus.forEach(actions => {
      itemCount += actions.length;
      if (actions.length === 0) {
        return;
      }
      this.elementRef.appendChild(createElement('div', {
        classes: ['textbus-contextmenu-group'],
        children: actions.map(item => {
          const btn = createElement('button', {
            attrs: {
              type: 'button'
            },
            props: {
              disabled: item.disabled
            },
            classes: ['textbus-contextmenu-item'],
            children: [
              createElement('span', {
                classes: ['textbus-contextmenu-item-icon'],
                children: [
                  createElement('span', {
                    classes: item.iconClasses ? item.iconClasses : []
                  })
                ]
              }),
              createElement('span', {
                classes: ['textbus-contextmenu-item-label'],
                children: [createTextNode(item.label)]
              })
            ]
          })
          if (!item.disabled) {
            btn.addEventListener('mousedown', () => {
              this.eventFromSelf = true;
            })
            btn.addEventListener('click', () => {
              item.action();
              if (item.autoRecordingHistory !== false) {
                this.history.record();
              }
              this.eventFromSelf = false;
            })
          }
          return btn;
        })
      }))
    })

    const menuWidth = 180 + 10;
    const menuHeight = itemCount * 26 + menus.length * 10 + menus.length + 10;

    setPosition();

    document.body.appendChild(this.elementRef);
  }

  destroy() {
    this.hide();
  }
}
