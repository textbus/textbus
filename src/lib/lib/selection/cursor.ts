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
    this.cursor.style.display = v ? 'block' : 'none';
  }

  private get display() {
    return this._display;
  }

  private _display = true;
  private flashing = true;

  constructor(private context: Document) {
    this.onInput = this.inputEvent.asObservable();
    this.onDelete = this.deleteEvent.asObservable();

    this.elementRef.style.cssText = 'position: absolute; width: 0; height:18px; pointer-events: none;';
    this.cursor.style.cssText = 'width: 2px; height: 100%; background: #000; position: absolute; left:0; top:0; box-shadow: 0 0 3px rgba(255,255,255,.3)';
    this.inputWrap.style.cssText = 'width: 2px; height: 0; position: absolute; overflow: hidden';
    this.input.style.cssText = 'width: 2000px; padding: 0; background: red; border: none; outline: none; position: absolute; left:0; top:0';

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

  show(position: ClientRect) {
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
