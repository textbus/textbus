export abstract class ViewNode {
  readonly length = 1;
  abstract render(): Node;
}
