import { Lifecycle, Renderer } from '../core/_api';

export class ImageResizeHook implements Lifecycle {
  private mask = document.createElement('div');
  private handle1 = document.createElement('button');
  private handle2 = document.createElement('button');
  private handle3 = document.createElement('button');
  private handle4 = document.createElement('button');
  private handle5 = document.createElement('button');
  private handle6 = document.createElement('button');
  private handle7 = document.createElement('button');
  private handle8 = document.createElement('button');

  constructor() {
    this.mask.className = 'tbus-image-resize-hooks-handler';
    const handlers = [this.handle1,
      this.handle2,
      this.handle3,
      this.handle4,
      this.handle5,
      this.handle6,
      this.handle7,
      this.handle8];
    handlers.forEach(b => b.type = 'button');
    this.mask.append(...handlers);
  }

  setup(renderer: Renderer, contextDocument: Document, contextWindow: Window, frameContainer: HTMLElement) {
    contextDocument.addEventListener('click', ev => {
      const srcElement = ev.target as HTMLImageElement;
      if (/^img$/i.test(srcElement.nodeName)) {
        const selection = contextDocument.getSelection();
        selection.removeAllRanges();
        const range = contextDocument.createRange();
        range.selectNode(srcElement);
        selection.addRange(range);
        const rect = srcElement.getBoundingClientRect();
        this.mask.style.cssText = `left: ${rect.left}px; top: ${rect.top}px; width: ${rect.width}px; height: ${rect.height}px`;
        frameContainer.append(this.mask);
      } else {
        if (this.mask.parentNode) {
          this.mask.parentNode.removeChild(this.mask);
        }
      }
    })
  }
}
