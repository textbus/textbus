import { VNode } from '../renderer/virtual-dom';

export abstract class View {
  readonly length = 1;

  get dirty() {
    return this._dirty;
  }

  get dataChanged() {
    return this._dataChanged;
  }

  abstract parent: View;

  private _dirty = true;
  private _dataChanged = true;

  abstract clone(): View;

  viewSynced() {
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
