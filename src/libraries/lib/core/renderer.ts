import { AbstractData } from './abstract-data';

export interface Renderer {
  render(abstractData: AbstractData): HTMLElement;
}
