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

  private infinityLoop = false;

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
      if (this.infinityLoop) {
        throw new Error(`The parent of the current fragment generates a circular reference!`);
      }
      this.infinityLoop = true;
      this.parent.markDirty(false);
      this.infinityLoop = false;
    }
  }
}
