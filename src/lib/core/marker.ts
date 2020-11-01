import { Observable, Subject } from 'rxjs';

export abstract class Marker {
  onChange: Observable<void>;

  get dirty() {
    return this._dirty;
  }

  get changed() {
    return this._changed;
  }

  private _dirty = true;
  private _changed = true;
  private changeEvent = new Subject<void>();

  protected constructor() {
    this.onChange = this.changeEvent.asObservable();
  }

  markAsDirtied() {
    this._dirty = true;
    this.markAsChanged();
  }

  markAsChanged() {
    this._changed = true;
    this.changeEvent.next();
  }

  rendered() {
    this._dirty = this._changed = false;
  }
}
