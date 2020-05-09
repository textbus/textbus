import { VElement } from './element';

export interface Renderer {
  render(vDom: Array<VElement | string>, host: HTMLElement): void;
}
