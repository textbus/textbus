import { fromEvent, Observable, Subject } from 'rxjs';

export class Cursor {
  onInput: Observable<string>;
  onDelete: Observable<void>;
  readonly elementRef = document.createElement('div');

  private input = document.createElement('textarea');
  private cursor = document.createElement('span');
  private inputWrap = document.createElement('span');

  private inputEvent = new Subject<string>();
  private deleteEvent = new Subject<void>();

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

  constructor(private context: Document) {
    this.onInput = this.inputEvent.asObservable();
    this.onDelete = this.deleteEvent.asObservable();

    this.elementRef.classList.add('tanbo-editor-selection');
    this.cursor.classList.add('tanbo-editor-cursor');
    this.inputWrap.classList.add('tanbo-editor-input-wrap');
    this.input.classList.add('tanbo-editor-input');

    this.inputWrap.appendChild(this.input);

    this.elementRef.appendChild(this.inputWrap);
    this.elementRef.appendChild(this.cursor);
    fromEvent(this.input, 'compositionend').subscribe(() => {
      this.inputEvent.next(this.input.value);
      this.input.value = '';
    });

    fromEvent(this.input, 'keydown').subscribe((ev: KeyboardEvent) => {
      if (ev.key === 'Backspace') {
        this.deleteEvent.next();
      }
    });
    fromEvent(context, 'mousedown').subscribe(() => {
      this.flashing = false;
      this.context.getSelection().removeAllRanges();
    });
    fromEvent(context, 'mouseup').subscribe(() => {
      this.flashing = true;
    });
  }

  show(position: { left: number, top: number, height: number }) {
    this.elementRef.style.left = position.left + 'px';
    this.elementRef.style.top = position.top + 'px';
    this.elementRef.style.height = position.height + 'px';
    this.display = true;
    clearTimeout(this.timer);
    const toggleShowHide = () => {
      this.display = !this.display || !this.flashing;
      this.timer = setTimeout(toggleShowHide, 400);
    };
    this.timer = setTimeout(toggleShowHide, 400);
    this.input.focus();
  }

  hide() {
    this.display = false;
    clearTimeout(this.timer);
  }
}
