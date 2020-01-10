import { VElement } from './element';

export interface ElementRef {
  readonly nativeElement: any;
  readonly name: string;
  readonly parent: ElementRef;

  insert(newChild: NodeRef, index: number): void;

  append(newChild: NodeRef): void;

  getAttribute(key: string): string;

  getStyles(): { [key: string]: string };

  destroy(): void;
}

export interface TextRef {
  readonly nativeElement: any;
  readonly parent: ElementRef;
  textContent: string;
  destroy(): void;
}

export type NodeRef = TextRef | ElementRef;

export abstract class Renderer {
  abstract createElement(element: VElement): ElementRef;

  abstract createTextNode(text: string): TextRef;
}
