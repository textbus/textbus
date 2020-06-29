import { Lifecycle, Renderer } from '../core/_api';

export class ImageResizeHook implements Lifecycle {
  setup(renderer: Renderer, contextDocument: Document, contextWindow: Window, frameContainer: HTMLElement) {
    contextDocument.addEventListener('click', ev => {
      const srcElement = ev.target as Node;
      if (/^img$/i.test(srcElement.nodeName)) {
        const selection = contextDocument.getSelection();
        selection.removeAllRanges();
        const range = contextDocument.createRange();
        range.selectNode(srcElement);
        selection.addRange(range);
      }
    })
  }
}
