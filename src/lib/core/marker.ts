/*
 * @Author: your name
 * @Date: 2021-01-07 14:33:16
 * @LastEditTime: 2021-01-26 13:30:00
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \textbus\src\lib\core\marker.ts
 */
import { Observable, Subject } from 'rxjs';

/**
 * textbus 中所有的内容都通过可编辑片段 (Fragment) 和组件 (Componet) 来描述。Fragment 通过
 * 数组来管理一组元素， 每个元素为字符串或着组件。组件用来描述一个具有特定功能和结构的 UI 部
 * 件(模板，其中包含若千个由 Fragment 描述的可编辑区域, 称为插槽)。
 * 
 * Fragment 和 Component 都是 Marker 的子类。Marker 主要用来记录数据变化，并在数据发生变化时
 * 派发事件。
 * 
 * 当 Fragment/Component 自身的数据发生变化时,例如 Fragment 维护的内容数组长度或 Component 维护的
 * 插槽数组长度发生变化时，当前 Fragment/Component 的 dirty 会设为 true.
 * 
 * 当 Fragment/Component 的子部件的数据发生变化时，例如当 Fragment 维护的内容数组中的元素
 * 的数据或 Component 维护的插槽中的数据发生变化时，当前 Fragment/Component 的 changed 会设
 * 为 true.
 */
export abstract class Marker {
  /**当标记改变时触发 */
  onChange: Observable<void>;

  /**
   * 获取是否是脏数据
   */
  get dirty() {
    return this._dirty;
  }

  /**
   * 获取是否是已更改的数据
   */
  get changed() {
    return this._changed;
  }

  /**
   * 获取是否是要输出的脏数据
   */
  get outputDirty() {
    return this._outputDirty;
  }

  /**
   * 获取是否是要输出的已更改的数据
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
    console.log('Marker');
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
   * 输出渲染完成,标记为正常数据
   */
  outputRendered() {
    this._outputDirty = this._outputChanged = false;
  }
}
