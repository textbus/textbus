import { Observable } from 'rxjs';

export interface TBEvent {
  target: TBNode;
}

export interface StyleRange {
  beginIndex: number;
  closeIndex: number;
}

export interface TBNode {
  elementRef: Node;
  length: number;
  onDestroy: Observable<void>;
  onContentChange: Observable<TBEvent>;

  destroy(): void;
}

export interface TBElement extends TBNode {
  // tagName: string;
  // parentNode: TBEvenNode;
}

export interface TBEvenNode extends TBElement {
  addNode(node: TBNode, atIndex?: number): void;
}

export interface TBBlockElement extends TBEvenNode {
  styleMatrix: Map<string, StyleRange[]>;
}
