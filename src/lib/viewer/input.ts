import { fromEvent, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

import { TBSelection } from '../core/_api';

/**
 * 快捷键配置项
 */
export interface Keymap {
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  key: string | string[];
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

export class Input {
  onInput: Observable<Event>;
  onFocus: Observable<Event>;
  onBlur: Observable<Event>;
  onPaste: Observable<Event>;
  onCopy: Observable<Event>;
  onCut: Observable<Event>;

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

  private selection: TBSelection;

  constructor(private context: Document) {

    this.elementRef.classList.add('textbus-selection');
    this.cursor.classList.add('textbus-cursor');
    this.inputWrap.classList.add('textbus-input-wrap');
    this.input.classList.add('textbus-input');

    this.inputWrap.appendChild(this.input);

    this.elementRef.appendChild(this.inputWrap);
    this.elementRef.appendChild(this.cursor);

    this.onInput = fromEvent(this.input, 'input');
    this.onFocus = fromEvent(this.input, 'focus');
    this.onBlur = fromEvent(this.input, 'blur');
    this.onPaste = fromEvent(this.input, 'paste');
    this.onCopy = fromEvent(this.input, 'copy');
    this.onCut = fromEvent(this.input, 'cut');

    let isWriting = false;
    fromEvent(this.input, 'compositionstart').subscribe(() => {
      isWriting = true;
    });

    fromEvent(this.input, 'compositionend').subscribe(() => {
      isWriting = false;
    });
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
    });

    fromEvent(context, 'mousedown').subscribe(() => {
      this.flashing = false;
    });
    fromEvent(context, 'mouseup').subscribe(() => {
      this.flashing = true;
    });

    this.onBlur.subscribe(() => {
      this.hide();
    })
  }

  /**
   * 添加快捷键
   * @param keymap
   */
  keymap(keymap: KeymapAction) {
    this.keymaps.push(keymap);
  }

  /**
   * 根据 Selection 更新光标显示位置及状态
   * @param selection
   * @param limit 光标显示的范围
   */
  updateStateBySelection(selection: TBSelection, limit: HTMLElement) {
    this.selection = selection;
    if (this.readonly || !selection.rangeCount) {
      this.hide();
      return;
    }
    this.updateCursorPosition(limit);
    if (selection.collapsed) {
      this.show();
    } else {
      this.hide();
    }
    this.input.focus()
  }

  /**
   * 清除当前输入框内的值
   */
  cleanValue() {
    this.input.value = '';
  }

  focus() {
    this.input.value = '';
    this.input.blur();
    this.input.focus();
  }

  private updateCursorPosition(limit: HTMLElement) {
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

  private show() {
    this.display = true;
    clearTimeout(this.timer);
    const toggleShowHide = () => {
      this.display = !this.display || !this.flashing;
      this.timer = setTimeout(toggleShowHide, 400);
    };
    this.timer = setTimeout(toggleShowHide, 400);
    this.input.focus();
  }

  private hide() {
    this.display = false;
    clearTimeout(this.timer);
  }
}
