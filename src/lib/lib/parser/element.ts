import { Observable } from 'rxjs';
import { Handler } from '../toolbar/handlers/help';

export interface TBEvent {
  target: TBNode;
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
}
