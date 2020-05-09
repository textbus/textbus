import { Renderer } from '../core/renderer';
import { VElement } from '../core/element';

export class DomRenderer implements Renderer {
  render(vDom: VElement, host: HTMLElement) {
    console.log(vDom);
  }
}
