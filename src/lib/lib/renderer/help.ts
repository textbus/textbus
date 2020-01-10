import { VElement } from './element';

export interface NativeElement {
  elementRef: any;
  name: string;
  isEmpty: boolean;
  parent: NativeElement;

  insert(newChild: NativeNode, index: number): void;

  append(newChild: NativeNode): void;

  getAttribute(key: string): string;

  getStyles(): { [key: string]: string };

  destroy(): void;
}

export interface NativeText {
  elementRef: any;
  textContent: string;
  parent: NativeElement;
  destroy(): void;
}

export type NativeNode = NativeText | NativeElement;

export abstract class Renderer {
  abstract createElement(element: VElement): NativeElement;

  abstract createTextNode(text: string): NativeText;
}
