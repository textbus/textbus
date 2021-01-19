import { Observable, Subject } from 'rxjs';

/**
 * 做标记类
 * 主要用于更新DOM
 */
export abstract class Marker {
  /**当标记改变时触发 */
  onChange: Observable<void>;

  /**
   * 脏的
   */
  get dirty() {
    return this._dirty;
  }

  /**
   * 改变的
   */
  get changed() {
    return this._changed;
  }

  /**
   * 输出脏的
   */
  get outputDirty() {
    return this._outputDirty;
  }

  /**
   * 输出改变的
   */
  get outputChanged() {
    return this._outputChanged;
  }

  private _dirty = true;
  private _changed = true;
  private _outputDirty = true;
  private _outputChanged = true
  /**触发onChange */
  private changeEvent = new Subject<void>();

  protected constructor() {
    this.onChange = this.changeEvent.asObservable();
  }

  /**
   * 标记为脏数据
   */
  markAsDirtied() {
    this._dirty = true;
    this._outputDirty = true;
    this.markAsChanged();
  }

  /**
   * 触发改变
   */
  markAsChanged() {
    this._changed = true;
    this._outputChanged = true;
    this.changeEvent.next();
  }

  /**
   * 渲染完成，标记为正常数据
   */
  rendered() {
    this._dirty = this._changed = false;
  }

  /**
   * 输出渲染完成,标记为正常
   */
  outputRendered() {
    this._outputDirty = this._outputChanged = false;
  }
}
