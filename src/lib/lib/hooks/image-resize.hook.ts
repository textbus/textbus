import { Lifecycle, Renderer } from '../core/_api';
import { ImageTemplate } from '../templates/image.template';

export class ImageResizeHook implements Lifecycle {
  private mask = document.createElement('div');
  private handlers: HTMLButtonElement[] = [];

  private currentTemplate: ImageTemplate;
  private currentImage: HTMLImageElement;

  constructor() {
    this.mask.className = 'tbus-image-resize-hooks-handler';
    for (let i = 0; i < 8; i++) {
      const button = document.createElement('button');
      button.type = 'button';
      this.handlers.push(button);
    }
    this.mask.append(...this.handlers);

    this.mask.addEventListener('mousedown', ev => {
      if (!this.currentTemplate) {
        return;
      }
      const startRect = this.currentImage.getBoundingClientRect();
      this.currentTemplate.width = startRect.width + 'px';
      this.currentTemplate.height = startRect.height + 'px';

      const startX = ev.clientX;
      const startY = ev.clientY;
      const mouseMoveFn = (ev: MouseEvent) => {
        const moveX = ev.clientX;
        const moveY = ev.clientY;

        const width = startRect.width + moveX - startX;
        const height = startRect.height + moveY - startY;

        this.currentImage.style.width = this.currentTemplate.width = width + 'px';
        this.currentImage.style.height = this.currentTemplate.height + height + 'px';
      };

      const mouseUpFn = () => {
        document.removeEventListener('mousemove', mouseMoveFn);
        document.removeEventListener('mouseup', mouseUpFn);
      };
      document.addEventListener('mousemove', mouseMoveFn);
      document.addEventListener('mouseup', mouseUpFn);
    })
  }

  setup(renderer: Renderer, contextDocument: Document, contextWindow: Window, frameContainer: HTMLElement) {
    contextDocument.addEventListener('click', ev => {
      const srcElement = ev.target as HTMLImageElement;
      if (/^img$/i.test(srcElement.nodeName)) {
        const position = renderer.getPositionByNode(srcElement);
        this.currentImage = srcElement;
        this.currentTemplate = position.fragment.getContentAtIndex(position.startIndex) as ImageTemplate;
        const selection = contextDocument.getSelection();
        selection.removeAllRanges();
        const range = contextDocument.createRange();
        range.selectNode(srcElement);
        selection.addRange(range);
        const rect = srcElement.getBoundingClientRect();
        this.mask.style.cssText = `left: ${rect.left}px; top: ${rect.top}px; width: ${rect.width}px; height: ${rect.height}px`;
        frameContainer.append(this.mask);
      } else {
        // this.currentImage = null;
        // this.currentTemplate = null;
        if (this.mask.parentNode) {
          this.mask.parentNode.removeChild(this.mask);
        }
      }
    })
  }
}
