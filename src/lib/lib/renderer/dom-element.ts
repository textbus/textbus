import { NativeElement, NativeNode, NativeText } from './help';

export class DOMElement implements NativeElement {
  get name() {
    return this.elementRef.nodeName.toLowerCase();
  }

  get isEmpty() {
    return !!this.elementRef.firstChild;
  }

  get parent() {
    return new DOMElement(this.elementRef.parentNode);
  }

  constructor(public elementRef: any) {
  }

  insert(newChild: NativeNode, index: number): void {

  }

  append(newChild: NativeNode): void {

  }

  getAttribute(key: string): string {
    return '';
  }

  getStyles(): { [p: string]: string } {
    return this.elementRef.style as any;
  }

  destroy(): void {
    if (this.elementRef.parentNode) {
      this.elementRef.parentNode.removeChild(this.elementRef);
    }
    this.elementRef = null;
  }
}

export class DOMText implements NativeText {
  set textContent(t: string) {
    this._textContent = t;
  }

  get textContent() {
    return this._textContent;
  }

  get parent() {
    return new DOMElement(this.elementRef.parentNode);
  }

  private _textContent = '';

  constructor(public elementRef: any) {
  }

  destroy(): void {
    if (this.elementRef.parentNode) {
      this.elementRef.parentNode.removeChild(this.elementRef);
    }
    this.elementRef = null;
  }
}
