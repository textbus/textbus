import { fromEvent } from 'rxjs';

import { Events, Keymap } from './events';
import { getRangePosition, isWindows } from './tools';

export class Cursor {
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
  keymap(keymap: Keymap) {
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
    let rect = getRangePosition(range);
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
