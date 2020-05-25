import { Renderer } from './renderer';
import { TBSelection } from './selection';

export interface Lifecycle {
  onInit?(): void;

  onEnter?(renderer: Renderer, selection: TBSelection): boolean;

  onSelectionChange?(): void;

  onRender?(): void;
}
