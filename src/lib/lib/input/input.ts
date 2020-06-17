import { fromEvent, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

import { TBRange } from '../core/range';

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
export class Events {
  onInput: Observable<Event>;
  onFocus: Observable<Event>;
  onBlur: Observable<Event>;
  onPaste: Observable<Event>;
  onCopy: Observable<Event>;
  onCut: Observable<Event>;

  private keymaps: KeymapAction[] = [];

  constructor(private input: HTMLInputElement | HTMLTextAreaElement) {
    this.setup();
  }

  /**
   * 添加快捷键
   * @param keymap
   */
  addKeymap(keymap: KeymapAction) {
    this.keymaps.push(keymap);
  }

  private setup() {
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
      const reg = /\w+/.test(ev.key) ? new RegExp(`^${ev.key}$`, 'i') : new RegExp(`^[${ev.key}]$`, 'i');
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
  }
}

export class Input {
  events: Events;
  input = document.createElement('textarea');

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

  private selection: Selection;

  constructor(private context: Document) {

    this.elementRef.classList.add('tbus-selection');
    this.cursor.classList.add('tbus-cursor');
    this.inputWrap.classList.add('tbus-input-wrap');
    this.input.classList.add('tbus-input');

    this.inputWrap.appendChild(this.input);

    this.elementRef.appendChild(this.inputWrap);
    this.elementRef.appendChild(this.cursor);

    this.events = new Events(this.input);
    fromEvent(context, 'mousedown').subscribe(() => {
      this.flashing = false;
    });
    fromEvent(context, 'mouseup').subscribe(() => {
      this.flashing = true;
    });

    fromEvent(context, 'scroll').subscribe(() => {
      this.updateCursorPosition();
    });

    this.events.onBlur.subscribe(() => {
      this.hide();
    })
  }

  /**
   * 添加快捷键
   * @param keymap
   */
  keymap(keymap: KeymapAction) {
    this.events.addKeymap(keymap);
  }

  /**
   * 根据 Selection 更新光标显示位置及状态
   * @param selection
   */
  updateStateBySelection(selection: Selection) {
    this.selection = selection;
    if (!selection.rangeCount) {
      return;
    }
    this.updateCursorPosition();
    if (selection.isCollapsed) {
      this.show();
    } else {
      this.hide();
    }
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

  private updateCursorPosition() {
    if (!this.selection || !this.selection.rangeCount) {
      return;
    }
    const startContainer = this.selection.focusNode;
    const startOffset = this.selection.focusOffset;
    const range = document.createRange();
    range.setStart(startContainer, startOffset);
    range.collapse();
    let rect = TBRange.getRangePosition(range);
    const {fontSize, lineHeight, color} = getComputedStyle((startContainer.nodeType === 1 ? startContainer : startContainer.parentNode) as HTMLElement);

    if (isWindows) {
      this.inputWrap.style.top = fontSize;
    }

    const boxHeight = Number.parseInt(fontSize) * Number.parseFloat(lineHeight);

    this.elementRef.style.left = rect.left + 'px';
    this.elementRef.style.top = rect.top + 'px';
    this.elementRef.style.height = (rect.height || boxHeight) + 'px';
    this.cursor.style.backgroundColor = color;
    this.input.style.lineHeight = boxHeight + '';
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
