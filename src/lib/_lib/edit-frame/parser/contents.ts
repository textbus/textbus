export class Contents {
  get length() {
    return this.elements.reduce((p, n) => p + n.length, 0);
  }

  private elements: Array<{ length: number }> = [];

  add(content: { length: number }) {
    this.elements.push(content);
  }
}
