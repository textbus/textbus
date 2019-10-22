import { Observable } from 'rxjs';

export interface TBNode {
  length: number;
  onDestroy: Observable<void>;
  onContentChange: Observable<this>;

  destroy(): void;

  render(): DocumentFragment | Node;
}

export interface TBEvenNode extends TBNode {
  addNode(node: TBNode, atIndex?: number): void;
}
