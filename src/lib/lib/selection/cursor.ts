import { fromEvent, merge, Observable, Subject } from 'rxjs';
import { TBSelection } from './selection';
import { Fragment } from '../parser/fragment';

export interface InputEvent {
  value: string;
  offset: number;
  fragment: Fragment;
  selection: TBSelection;
}

interface CursorStyle {
  left: number;
  top: number;
  height: number;
  fontSize: string;
  lineHeight: string;
}

export class Cursor {
  onInput: Observable<InputEvent>;
  onDelete: Observable<void>;
  onFocus: Observable<void>;
  onBlur: Observable<void>;
  readonly elementRef = document.createElement('div');

  private input = document.createElement('textarea');
  private cursor = document.createElement('span');
  private inputWrap = document.createElement('span');

  private inputEvent = new Subject<InputEvent>();
  private deleteEvent = new Subject<void>();
  private focusEvent = new Subject<void>();
  private blurEvent = new Subject<void>();

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
  private editingFragment: Fragment;

  constructor(private context: Document, private selection: TBSelection) {
    this.onInput = this.inputEvent.asObservable();
    this.onDelete = this.deleteEvent.asObservable();
    this.onFocus = this.focusEvent.asObservable();
    this.onBlur = this.blurEvent.asObservable();

    this.elementRef.classList.add('tanbo-editor-selection');
    this.cursor.classList.add('tanbo-editor-cursor');
    this.inputWrap.classList.add('tanbo-editor-input-wrap');
    this.input.classList.add('tanbo-editor-input');

    this.inputWrap.appendChild(this.input);

    this.elementRef.appendChild(this.inputWrap);
    this.elementRef.appendChild(this.cursor);
    merge(...[
      'input',
    ].map(type => fromEvent(this.input, type))).subscribe(() => {
      if (!this.selection.collapsed) {
        this.deleteEvent.next();
        this.inputStartSelection = selection.clone();
        this.editingFragment = selection.commonAncestorFragment.clone();
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

    fromEvent(this.input, 'blur').subscribe(() => {
      this.hide();
      this.blurEvent.next();
    });

    fromEvent(this.input, 'keydown').subscribe((ev: KeyboardEvent) => {
      if (ev.key === 'Backspace' && !this.input.value.length) {
        this.deleteEvent.next();
        this.inputStartSelection = selection.clone();
        this.editingFragment = selection.commonAncestorFragment.clone();
      }
    });
    fromEvent(context, 'mousedown').subscribe(() => {
      this.flashing = false;
      selection.removeAllRanges();
    });
    fromEvent(context, 'mouseup').subscribe(() => {
      this.flashing = true;
    });

    selection.onSelectionChange.subscribe(s => {
      if (!s.rangeCount) {
        return;
      }
      const startContainer = s.firstRange.rawRange.startContainer;
      const startOffset = s.firstRange.rawRange.startOffset;
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
      this.updateCursorPosition(style);
      if (s.collapsed) {
        this.show();
      } else {
        this.hide();
      }
    })
  }

  private focus() {
    this.inputStartSelection = this.selection.clone();
    this.editingFragment = this.selection.commonAncestorFragment.clone();
    this.input.value = '';
    this.focusEvent.next();
  }

  private updateCursorPosition(style: CursorStyle) {
    this.elementRef.style.left = style.left + 'px';
    this.elementRef.style.top = style.top + 'px';
    this.elementRef.style.height = style.height + 'px';
    this.input.style.lineHeight = style.lineHeight;
    // this.inputWrap.style.top = style.fontSize;
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
