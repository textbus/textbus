import { Template } from './template';

export class Contents {
  get length() {
    return this.elements.reduce((p, n) => p + n.length, 0);
  }
  private elements: Array<Template | string> = [];

  append(content: Template|string) {
    const lastChildIndex = this.elements.length - 1;
    const lastChild = this.elements[lastChildIndex];
    if (typeof lastChild === 'string' && typeof content === 'string') {
      this.elements[lastChildIndex] = lastChild + content;
    } else {
      this.elements.push(content);
    }
  }
}
