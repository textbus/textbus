import { Observable, Subject } from 'rxjs';

export class FullScreen {
  onChange: Observable<boolean>;
  elementRef = document.createElement('button');

  set full(b: boolean) {
    this._full = b;
    this.icon.className = b ? 'tbus-icon-shrink' : 'tbus-icon-enlarge';
  }

  get full() {
    return this._full;
  }

  private _full = false;
  private icon = document.createElement('span');
  private changeEvent = new Subject<boolean>();

  constructor() {
    this.onChange = this.changeEvent.asObservable();
    this.elementRef.type = 'button';
    this.elementRef.title = '切换全屏模式';
    this.elementRef.className = 'tbus-full-screen';
    this.elementRef.appendChild(this.icon);
    this.elementRef.addEventListener('click', () => {
      this.full = !this.full;
      this.changeEvent.next(this.full);
    });
  }
}
