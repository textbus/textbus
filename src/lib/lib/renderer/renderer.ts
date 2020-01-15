import { VElement } from './element';

export interface ElementRef {
  readonly nativeElement: unknown;
  readonly name: string;
  readonly parent: ElementRef;

  insert(newChild: NodeRef, index: number): void;

  append(newChild: NodeRef): void;

  destroy(): void;
}

export interface TextRef {
  readonly nativeElement: unknown;
  readonly parent: ElementRef;
  textContent: string;

  destroy(): void;
}

export type NodeRef = TextRef | ElementRef;

export interface Renderer {
  createElement(element: VElement): ElementRef;

  createTextNode(text: string): TextRef;
}
