import { ElementRef, NodeRef, TextRef } from './help';

export class DOMElement implements ElementRef {
  get name() {
    return this.nativeElement.nodeName.toLowerCase();
  }

  get parent() {
    return new DOMElement(this.nativeElement.parentNode as HTMLElement);
  }

  constructor(public nativeElement: HTMLElement) {
  }

  insert(newChild: NodeRef, index: number): void {
    const previousSibling = this.nativeElement.childNodes[index];
    if (previousSibling) {
      if (previousSibling.nextSibling) {
        if (previousSibling.nextSibling !== newChild.nativeElement) {
          this.nativeElement.insertBefore(newChild.nativeElement, previousSibling.nextSibling);
        }
      } else {
        this.append(newChild);
      }
    } else if (newChild.nativeElement.parentNode !== this.nativeElement) {
      if (this.nativeElement.firstChild) {
        this.nativeElement.appendChild(newChild.nativeElement);
      } else {
        this.nativeElement.insertBefore(newChild.nativeElement, this.nativeElement.firstChild);
      }
    }
  }

  append(newChild: NodeRef): void {
    this.nativeElement.appendChild(newChild.nativeElement);
  }

  getAttribute(key: string): string {
    return this.nativeElement.getAttribute(key);
  }

  getStyles(): { [p: string]: string } {
    return this.nativeElement.style as any;
  }

  destroy(): void {
    if (this.nativeElement.parentNode) {
      this.nativeElement.parentNode.removeChild(this.nativeElement);
    }
    this.nativeElement = null;
  }
}

export class DOMText implements TextRef {
  set textContent(v: string) {
    this.nativeElement.textContent = v.replace(/\s\s+/g, str => {
      return ' ' + Array.from({
        length: str.length - 1
      }).fill('\u00a0').join('');
    }).replace(/^\s|\s$/g, '\u00a0');
  }

  get textContent() {
    return this.nativeElement.textContent;
  }

  get parent() {
    return new DOMElement(this.nativeElement.parentNode as HTMLElement);
  }

  constructor(public nativeElement: Text) {
  }

  destroy(): void {
    if (this.nativeElement.parentNode) {
      this.nativeElement.parentNode.removeChild(this.nativeElement);
    }
    this.nativeElement = null;
  }
}
