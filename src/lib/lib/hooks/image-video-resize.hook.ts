import { Lifecycle, Renderer } from '../core/_api';
import { ImageTemplate, VideoTemplate } from '../templates/_api';

function matchAngle(x: number, y: number, startAngle: number, endAngle: number) {
  let angle = Math.atan(x / y) / (Math.PI / 180);
  if (x <= 0 && y >= 0 || x >= 0 && y >= 0) {
    angle = 180 + angle;
  }
  if (x >= 0 && y <= 0) {
    angle = 360 + angle;
  }
  if (startAngle <= endAngle) {
    return angle >= startAngle && angle <= endAngle;
  }
  return angle >= startAngle && angle <= 360 || angle <= endAngle && angle <= 0;
}

export class ImageVideoResizeHook implements Lifecycle {
  private mask = document.createElement('div');
  private text = document.createElement('div');
  private handlers: HTMLButtonElement[] = [];

  private currentTemplate: ImageTemplate | VideoTemplate;
  private currentElement: HTMLImageElement | HTMLVideoElement;
  private frameContainer: HTMLElement;

  constructor() {
    this.mask.className = 'tbus-image-resize-hooks-handler';
    for (let i = 0; i < 8; i++) {
      const button = document.createElement('button');
      button.type = 'button';
      this.handlers.push(button);
    }
    this.mask.append(...this.handlers);
    this.mask.append(this.text);

    this.mask.addEventListener('mousedown', ev => {
      if (!this.currentTemplate) {
        return;
      }

      this.frameContainer.style.pointerEvents = 'none';

      const startRect = this.currentElement.getBoundingClientRect();
      this.currentTemplate.width = startRect.width + 'px';
      this.currentTemplate.height = startRect.height + 'px';

      const startX = ev.clientX;
      const startY = ev.clientY;

      const startWidth = startRect.width;
      const startHeight = startRect.height;
      const startHypotenuse = Math.sqrt(startWidth * startWidth + startHeight * startHeight);

      let endWidth = startWidth;
      let endHeight = startHeight;
      const index = this.handlers.indexOf(ev.target as HTMLButtonElement);
      const mouseMoveFn = (ev: MouseEvent) => {

        const moveX = ev.clientX;
        const moveY = ev.clientY;

        const offsetX = moveX - startX;
        const offsetY = moveY - startY;

        if ([0, 2, 4, 6].includes(index)) {

          const gainHypotenuse = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
          let proportion = gainHypotenuse / startHypotenuse;

          if (!(index === 0 && matchAngle(offsetX, offsetY, 315, 135) ||
            index === 2 && matchAngle(offsetX, offsetY, 225, 45) ||
            index === 4 && matchAngle(offsetX, offsetY, 135, 315) ||
            index === 6 && matchAngle(offsetX, offsetY, 45, 225))) {
            proportion = -proportion;
          }

          endWidth = startWidth + startWidth * proportion;
          endHeight = startHeight + startHeight * proportion;
          this.currentElement.style.width = endWidth + 'px';
          this.currentElement.style.height = endHeight + 'px';
        } else if ([1, 5].includes(index)) {
          endHeight = startHeight + (index === 1 ? -offsetY : offsetY);
          this.currentElement.style.height = endHeight + 'px';
        } else if ([3, 7].includes(index)) {
          endWidth = startWidth + (index === 3 ? offsetX : -offsetX)
          this.currentElement.style.width = endWidth + 'px';
        }

        const rect = this.currentElement.getBoundingClientRect();
        this.text.innerText = `${Math.round(rect.width)}px * ${Math.round(rect.height)}px`;
        this.mask.style.cssText = `left: ${rect.left}px; top: ${rect.top}px; width: ${rect.width}px; height: ${rect.height}px;`;
      };

      const mouseUpFn = () => {
        this.currentTemplate.width = endWidth + 'px';
        this.currentTemplate.height = endHeight + 'px';
        this.frameContainer.style.pointerEvents = '';
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
      if (/^img$|video/i.test(srcElement.nodeName)) {
        const position = renderer.getPositionByNode(srcElement);
        this.currentElement = srcElement;
        this.currentTemplate = position.fragment.getContentAtIndex(position.startIndex) as ImageTemplate;
        this.frameContainer = frameContainer;
        const selection = contextDocument.getSelection();
        selection.removeAllRanges();
        const range = contextDocument.createRange();
        range.selectNode(srcElement);
        selection.addRange(range);
        const rect = srcElement.getBoundingClientRect();
        this.mask.style.cssText = `left: ${rect.left}px; top: ${rect.top}px; width: ${rect.width}px; height: ${rect.height}px;`;
        this.text.innerText = `${Math.round(rect.width)}px * ${Math.round(rect.height)}px`;
        frameContainer.append(this.mask);
      } else {
        this.currentElement = null;
        this.currentTemplate = null;
        if (this.mask.parentNode) {
          this.mask.parentNode.removeChild(this.mask);
        }
      }
    })
  }
}
