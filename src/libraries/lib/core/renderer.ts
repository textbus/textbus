import { VElement } from './element';

export interface Renderer {
  render(vDom: VElement, host: HTMLElement): void;
}
