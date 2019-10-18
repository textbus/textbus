export class Cursor {
  readonly elementRef = document.createElement('div');

  private timer: any = null;
  private isShow = false;

  private set display(v: boolean) {
    this._display = v;
    this.elementRef.style.display = v ? 'block' : 'none';
  }

  private get display() {
    return this._display;
  }

  private _display = true;

  constructor() {
    this.elementRef.style.cssText = 'width: 2px; height: 18px; background: #000; position: absolute';
    this.elementRef.getBoundingClientRect()
  }

  updatePosition(position: { left: number; top: number }) {
    this.elementRef.style.left = position.left + 'px';
    this.elementRef.style.top = position.top + 'px';
  }

  show() {
    if (this.isShow) {
      return;
    }
    this.isShow = true;
    const toggleShowHide = () => {
      this.display = !this.display;
      this.timer = setTimeout(toggleShowHide, 400);
    };
    this.timer = setTimeout(toggleShowHide, 400);
  }

  hide() {
    this.isShow = false;
    this.display = false;
    clearTimeout(this.timer);
  }
}
