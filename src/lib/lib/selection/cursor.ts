import { fromEvent, merge, Observable, race, Subject } from 'rxjs';
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
      this.inputEvent.next({
        value: this.input.value,
        offset: this.input.selectionStart,
        selection: this.inputStartSelection.clone(),
        fragment: this.editingFragment.clone()
      });
    });

    fromEvent(this.input, 'focus').subscribe(() => {
      this.focus()
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
      if (s.collapsed) {
        if (s.rangeCount) {
          const focusNode = s.focusNode;
          let style: CursorStyle;
          console.log(s.focusNode)
          const computedStyle = getComputedStyle((focusNode.nodeType === 1 ? focusNode : focusNode.parentNode) as HTMLElement);
          if (focusNode.nodeType === 3) {
            const rect = s.firstRange.rawRange.getBoundingClientRect();
            style = {
              left: rect.left,
              top: rect.top,
              height: rect.height,
              fontSize: computedStyle.fontSize,
              lineHeight: computedStyle.lineHeight
            };

          } else {
            if (focusNode.childNodes.length) {
              const rect = (focusNode.childNodes[s.firstRange.rawRange.startOffset - 1] as HTMLElement).getBoundingClientRect();
              style = {
                left: rect.right,
                top: rect.top,
                height: rect.height,
                fontSize: computedStyle.fontSize,
                lineHeight: computedStyle.lineHeight
              }
            } else {
              const rect = (focusNode as HTMLElement).getBoundingClientRect();
              style = {
                left: rect.left,
                top: rect.top,
                height: rect.height,
                fontSize: computedStyle.fontSize,
                lineHeight: computedStyle.lineHeight
              };
            }
            if (!style.height) {
              style.height = Number.parseInt(style.fontSize) * Number.parseFloat(style.lineHeight);
            }
          }
          this.show(style);
        }
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

  private show(style: CursorStyle) {
    this.elementRef.style.left = style.left + 'px';
    this.elementRef.style.top = style.top + 'px';
    this.elementRef.style.height = style.height + 'px';
    this.input.style.lineHeight = style.lineHeight;
    this.inputWrap.style.top = style.fontSize;
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
