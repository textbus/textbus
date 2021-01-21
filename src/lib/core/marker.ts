import { Observable, Subject } from 'rxjs';

/**
 * textbus中所有的内容都通过可编辑片段(Fragment)和组件(Componet)来描述。Fragment通过
 * 数组来管理一组元素， 每个元素为字符串或着组件。组件用来描述一个具有特定功能和结构的UI部
 * 件(模板，其中包含若千个由Fragment描述的可编辑区域, 称为插槽)。
 * 
 * Fragment和Component都是Marker的子类。Marker主 要用来记录数据变化，并在数据发生变化时
 * 派发事件。
 * 
 * 当Fragment/Component自身的数据发生变化时,例如Fragment维护的内容数组长度或Component维护的
 * 插槽数组长度发生变化时，当前Fragment/Component的dirty会设为true.
 * 
 * 当Fragment/Component的子部件的数据发生变化时，例如当Fragment维护的内容数组中的元素
 * 的数据或Component维护的插槽中的数据发生变化时，当前Fragment/Component的changed会设
 * 为true.
 */
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
