import { Observable, Subject } from 'rxjs';

export abstract class Marker {
  onChange: Observable<void>;

  get dirty() {
    return this._dirty;
  }

  get changed() {
    return this._changed;
  }

  get outputDirty() {
    return this._outputDirty;
  }

  get outputChanged() {
    return this._outputChanged;
  }

  private _dirty = true;
  private _changed = true;
  private _outputDirty = true;
  private _outputChanged = true
  private changeEvent = new Subject<void>();

  protected constructor() {
    this.onChange = this.changeEvent.asObservable();
  }

  markAsDirtied() {
    this._dirty = true;
    this._outputDirty = true;
    this.markAsChanged();
  }

  markAsChanged() {
    this._changed = true;
    this._outputChanged = true;
    this.changeEvent.next();
  }

  rendered() {
    this._dirty = this._changed = false;
  }

  outputRendered() {
    this._outputDirty = this._outputChanged = false;
  }
}
