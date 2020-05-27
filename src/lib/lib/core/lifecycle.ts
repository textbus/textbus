import { Renderer } from './renderer';
import { TBSelection } from './selection';

export interface Lifecycle {
  onInit?(): void;

  onInput?(renderer: Renderer, selection: TBSelection): boolean;

  onEnter?(renderer: Renderer, selection: TBSelection): boolean;

  onSelectionChange?(): void;

  onRender?(): void;
}
