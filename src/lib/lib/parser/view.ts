import { VirtualNode } from './virtual-dom';

export abstract class View {
  readonly length = 1;

  get dirty() {
    return this._dirty;
  }

  get dataChanged() {
    return this._dataChanged;
  }

  abstract parent: View;
  abstract virtualNode: VirtualNode;

  private _dirty = false;
  private _dataChanged = false;


  abstract render(host: HTMLElement): void;

  abstract clone(): View;

  viewRendered() {
    this._dataChanged = false;
    this._dirty = false;
  }

  markDirty(fromSelf = true) {
    this._dirty = true;
    if (fromSelf) {
      this._dataChanged = true;
    }
    if (this.parent) {
      this.parent.markDirty(false);
    }
  }
}
