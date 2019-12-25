import { VirtualNode } from './virtual-dom';

export abstract class View {
  readonly length = 1;

  // abstract formatMatrix: Map<Handler, FormatRange[]>;
  abstract virtualNode: VirtualNode;

  abstract render(host: HTMLElement): void;

  abstract clone(): View;
}
