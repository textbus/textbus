import { fromEvent } from 'rxjs';

import { TBSelection } from './selection';
import { Events, KeyMap } from './events';
import { isWindows } from './tools';

interface CursorStyle {
  left: number;
  top: number;
  height: number;
  fontSize: string;
  lineHeight: string;
}

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

  private selection: TBSelection;

  constructor(private context: Document) {

    this.elementRef.classList.add('tanbo-editor-selection');
    this.cursor.classList.add('tanbo-editor-cursor');
    this.inputWrap.classList.add('tanbo-editor-input-wrap');
    this.input.classList.add('tanbo-editor-input');

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

  keyMap(keyMap: KeyMap) {
    this.events.addKeyMap(keyMap);
  }

  updateStateBySelection(selection: TBSelection) {
    this.selection = selection;
    if (!selection.rangeCount) {
      return;
    }
    this.updateCursorPosition();
    if (selection.collapsed) {
      this.show();
    } else {
      this.hide();
    }
  }

  cleanValue() {
    this.input.value = '';
  }

  focus() {
    this.input.value = '';
  }

  private updateCursorPosition() {
    if (!this.selection || !this.selection.firstRange) {
      return;
    }
    const startContainer = this.selection.firstRange.nativeRange.startContainer;
    const startOffset = this.selection.firstRange.nativeRange.startOffset;
    const range = document.createRange();
    range.setStart(startContainer, startOffset);
    range.collapse();
    let rect = range.getBoundingClientRect();
    if (startContainer.nodeType === 1 &&
      startContainer.childNodes[startOffset] &&
      /^(br|img)$/i.test(startContainer.childNodes[startOffset].nodeName)) {
      rect = (startContainer.childNodes[startOffset] as HTMLElement).getBoundingClientRect();
    }
    const rect2 = ((startContainer.nodeType === 1 ? startContainer : startContainer.parentNode) as HTMLElement).getBoundingClientRect();
    const computedStyle = getComputedStyle((startContainer.nodeType === 1 ? startContainer : startContainer.parentNode) as HTMLElement);
    let style: CursorStyle = {
      left: Math.max(rect.left, rect2.left),
      top: Math.max(rect.top, rect2.top),
      height: rect.height,
      fontSize: computedStyle.fontSize,
      lineHeight: Number.parseInt(computedStyle.fontSize) * Number.parseFloat(computedStyle.lineHeight) + ''
    };
    if (!style.height) {
      style.height = Number.parseInt(style.fontSize) * Number.parseFloat(style.lineHeight);
    }
    if (isWindows) {
      this.inputWrap.style.top = style.fontSize;
    }
    this.elementRef.style.left = style.left + 'px';
    this.elementRef.style.top = style.top + 'px';
    this.elementRef.style.height = style.height + 'px';
    this.input.style.lineHeight = style.lineHeight;
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
