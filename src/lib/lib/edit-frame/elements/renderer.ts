export abstract class Renderer {
  abstract elements: Renderer[];
  render() {
    for(const el of this.elements) {
      el.render();
    }
  }
}
