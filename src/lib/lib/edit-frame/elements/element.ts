import { Observable } from 'rxjs';

export interface Attr {
  name: string;
  value?: string;
}

export interface Style {
  name: string,
  value: string | number;
}

export interface TBNode {
  elementRef: Node;
  length: number;
  onDestroy: Observable<void>;
  onContentChange: Observable<this>;

  destroy(): void;
}

export interface TBElement extends TBNode {
  tagName: string;
  parentNode: TBEvenNode;
  attrs: Array<Attr>;
  classes: string[];
  styles: Array<Style>;
}

export interface TBEvenNode extends TBElement {
  addNode(node: TBNode, atIndex?: number): void;
}

export interface TBBlockElement extends TBEvenNode {
  render(limitParent?: Node): Node;
}
