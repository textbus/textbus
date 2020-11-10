import { Lifecycle, Renderer, TBSelection, VElement } from '../core/_api';
import { ImageComponent, VideoComponent } from '../components/_api';

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

  private currentComponent: ImageComponent | VideoComponent;
  private currentElement: HTMLImageElement | HTMLVideoElement;
  private frameContainer: HTMLElement;

  private renderer: Renderer;

  constructor() {
    this.mask.className = 'textbus-image-video-resize-hooks-handler';
    for (let i = 0; i < 8; i++) {
      const button = document.createElement('button');
      button.type = 'button';
      this.handlers.push(button);
    }
    this.mask.append(...this.handlers);
    this.mask.append(this.text);

    this.mask.addEventListener('mousedown', ev => {
      if (!this.currentComponent) {
        return;
      }

      this.frameContainer.style.pointerEvents = 'none';

      const startRect = this.currentElement.getBoundingClientRect();
      this.currentComponent.width = startRect.width + 'px';
      this.currentComponent.height = startRect.height + 'px';

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

          endWidth = Math.round(startWidth + startWidth * proportion);
          endHeight = Math.round(startHeight + startHeight * proportion);

        } else if ([1, 5].includes(index)) {
          endHeight = Math.round(startHeight + (index === 1 ? -offsetY : offsetY));
        } else if ([3, 7].includes(index)) {
          endWidth = Math.round(startWidth + (index === 3 ? offsetX : -offsetX));
        }
        this.currentElement.style.width = endWidth + 'px';
        this.currentElement.style.height = endHeight + 'px';
        this.updateStyle();
      };

      const mouseUpFn = () => {
        this.currentComponent.width = endWidth + 'px';
        this.currentComponent.height = endHeight + 'px';
        this.frameContainer.style.pointerEvents = '';
        this.currentComponent.markAsDirtied();
        if (this.renderer) {
          const vEle = this.renderer.getVDomByNativeNode(this.currentElement) as VElement;
          vEle.styles.set('width', endWidth + 'px');
          vEle.styles.set('height', endHeight + 'px');
        }
        document.removeEventListener('mousemove', mouseMoveFn);
        document.removeEventListener('mouseup', mouseUpFn);
      };
      document.addEventListener('mousemove', mouseMoveFn);
      document.addEventListener('mouseup', mouseUpFn);
    })
  }

  setup(renderer: Renderer, contextDocument: Document, contextWindow: Window, frameContainer: HTMLElement) {
    this.renderer = renderer;
    contextDocument.addEventListener('click', ev => {
      const srcElement = ev.target as HTMLImageElement;
      if (/^img$|video/i.test(srcElement.nodeName)) {
        const position = renderer.getPositionByNode(srcElement);
        if (!position) {
          return;
        }
        this.currentElement = srcElement;
        this.currentComponent = position.fragment.getContentAtIndex(position.startIndex) as ImageComponent;
        this.frameContainer = frameContainer;
        const selection = contextDocument.getSelection();
        selection.removeAllRanges();
        const range = contextDocument.createRange();
        range.selectNode(srcElement);
        selection.addRange(range);
        this.updateStyle();
        frameContainer.append(this.mask);
      } else {
        this.currentElement = null;
        this.currentComponent = null;
        if (this.mask.parentNode) {
          this.mask.parentNode.removeChild(this.mask);
        }
      }
    })
  }

  onViewUpdated() {
    if (this.currentElement) {
      this.updateStyle();
    }
  }

  onSelectionChange(selection: TBSelection) {
    if (selection.collapsed) {
      this.currentElement = null;
      this.mask.parentNode?.removeChild(this.mask);
    }
  }

  private updateStyle() {
    const rect = this.currentElement.getBoundingClientRect();
    this.mask.style.cssText = `left: ${rect.left}px; top: ${rect.top}px; width: ${rect.width}px; height: ${rect.height}px;`;
    this.text.innerText = `${Math.round(rect.width)}px * ${Math.round(rect.height)}px`;
  }
}
