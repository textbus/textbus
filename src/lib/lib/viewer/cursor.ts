import { fromEvent, Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

import { TBSelection } from './selection';
import { Fragment } from '../parser/fragment';

interface CursorStyle {
  left: number;
  top: number;
  height: number;
  fontSize: string;
  lineHeight: string;
}

export interface InputEvent {
  value: string;
  offset: number;
  fragment: Fragment;
  selection: TBSelection;
}

export enum CursorMoveType {
  Left = 'Left',
  Right = 'Right',
  Up = 'Up',
  Down = 'Down'
}

export interface CursorMoveDirection {
  type: CursorMoveType,
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}


export class Cursor {
  onInput: Observable<InputEvent>;
  onDelete: Observable<void>;
  onFocus: Observable<void>;
  onBlur: Observable<void>;
  onNewLine: Observable<void>;
  onMove: Observable<CursorMoveDirection>;
  onSelectAll: Observable<void>;
  onPaste: Observable<HTMLElement>;
  readonly elementRef = document.createElement('div');

  private input = document.createElement('textarea');
  private cursor = document.createElement('span');
  private inputWrap = document.createElement('span');

  private inputEvent = new Subject<InputEvent>();
  private deleteEvent = new Subject<void>();
  private focusEvent = new Subject<void>();
  private blurEvent = new Subject<void>();
  private newLineEvent = new Subject<void>();
  private moveEvent = new Subject<CursorMoveDirection>();
  private selectAllEvent = new Subject<void>();
  private pasteEvent = new Subject<HTMLElement>();

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

  private inputStartSelection: TBSelection;
  private selection: TBSelection;
  private editingFragment: Fragment;

  private isWindows = /win(dows|32|64)/i.test(navigator.userAgent);
  private isMac = /mac os/i.test(navigator.userAgent);

  constructor(private context: Document) {
    this.onInput = this.inputEvent.asObservable();
    this.onDelete = this.deleteEvent.asObservable();
    this.onFocus = this.focusEvent.asObservable();
    this.onBlur = this.blurEvent.asObservable();
    this.onNewLine = this.newLineEvent.asObservable();
    this.onMove = this.moveEvent.asObservable();
    this.onSelectAll = this.selectAllEvent.asObservable();
    this.onPaste = this.pasteEvent.asObservable();

    this.elementRef.classList.add('tanbo-editor-selection');
    this.cursor.classList.add('tanbo-editor-cursor');
    this.inputWrap.classList.add('tanbo-editor-input-wrap');
    this.input.classList.add('tanbo-editor-input');

    this.inputWrap.appendChild(this.input);

    this.elementRef.appendChild(this.inputWrap);
    this.elementRef.appendChild(this.cursor);
    fromEvent(this.input, 'input').subscribe(() => {
      if (!this.selection.collapsed) {
        this.deleteEvent.next();
        this.inputStartSelection = this.selection.clone();
        this.editingFragment = this.selection.commonAncestorFragment.clone();
      }
      this.inputEvent.next({
        value: this.input.value,
        offset: this.input.selectionStart,
        selection: this.inputStartSelection.clone(),
        fragment: this.editingFragment.clone()
      });
    });

    fromEvent(this.input, 'focus').subscribe(() => {
      this.focus();
    });

    fromEvent(this.input, 'paste').subscribe(() => {
      const div = document.createElement('div');
      div.style.cssText = 'width:10px; height:10px; overflow: hidden; position: fixed; left: -9999px';
      div.contentEditable = 'true';
      document.body.appendChild(div);
      div.focus();
      setTimeout(() => {
        this.pasteEvent.next(div);
        document.body.removeChild(div);
      });
    });

    fromEvent(this.input, 'blur').subscribe(() => {
      this.hide();
      this.blurEvent.next();
    });
    let isWriting = false;
    fromEvent(this.input, 'compositionstart').subscribe(() => {
      isWriting = true;
    });

    fromEvent(this.input, 'compositionend').subscribe(() => {
      isWriting = false;
    });

    fromEvent(this.input, 'keydown').pipe(filter(() => {
      return !isWriting || !this.input.value;
    })).subscribe((ev: KeyboardEvent) => {
      if (ev.key === 'Backspace' && !this.input.value.length) {
        this.deleteEvent.next();
        this.inputStartSelection = this.selection.clone();
        this.editingFragment = this.selection.commonAncestorFragment.clone();
      } else if (ev.key === 'Enter' && !ev.shiftKey) {
        this.input.value = '';
        this.input.blur();
        this.newLineEvent.next();
        this.focus();
        ev.preventDefault();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(ev.key)) {

        const typeMap = {
          ArrowUp: CursorMoveType.Up,
          ArrowDown: CursorMoveType.Down,
          ArrowLeft: CursorMoveType.Left,
          ArrowRight: CursorMoveType.Right
        };
        this.moveEvent.next({
          type: typeMap[ev.key],
          shiftKey: ev.shiftKey,
          ctrlKey: ev.ctrlKey,
          altKey: ev.altKey
        });
        this.input.value = '';
        this.inputStartSelection = this.selection.clone();
        this.editingFragment = this.selection.commonAncestorFragment.clone();
      } else if (ev.key === 'a' && (this.isMac ? ev.metaKey : ev.ctrlKey)) {
        this.input.value = '';
        this.selectAllEvent.next();
      }
    });
    fromEvent(context, 'mousedown').subscribe(() => {
      this.flashing = false;
    });
    fromEvent(context, 'mouseup').subscribe(() => {
      this.flashing = true;
    });

    fromEvent(context, 'scroll').subscribe(() => {
      this.updateCursorPosition();
    });
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

  private focus() {
    this.inputStartSelection = this.selection.clone();
    this.editingFragment = this.selection.commonAncestorFragment.clone();
    this.input.value = '';
    this.focusEvent.next();
  }

  private updateCursorPosition() {
    if (!this.selection || !this.selection.firstRange) {
      return;
    }
    const startContainer = this.selection.firstRange.rawRange.startContainer;
    const startOffset = this.selection.firstRange.rawRange.startOffset;
    const range = document.createRange();
    range.setStart(startContainer, startOffset);
    range.collapse();
    let rect = range.getBoundingClientRect();
    if (startContainer.nodeType === 1 &&
      startContainer.childNodes[startOffset] &&
      startContainer.childNodes[startOffset].nodeName.toLowerCase() === 'br') {
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
    if (this.isWindows) {
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
