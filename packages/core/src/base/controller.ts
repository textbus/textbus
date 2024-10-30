import { Inject, Injectable } from '@viewfly/core'
import { distinctUntilChanged, Observable, Subject } from '@tanbo/stream'
import { READONLY } from './_injection-tokens'

/**
 * Textbus 控制器
 */
@Injectable()
export class Controller {
  /** 当只读模式变更时触发 */
  onReadonlyStateChange: Observable<boolean>

  /** 是否只读 */
  get readonly() {
    return this._readonly
  }

  set readonly(b: boolean) {
    this._readonly = b
    this.readonlyStateChangeEvent.next(b)
  }

  private _readonly = false

  private readonlyStateChangeEvent = new Subject<boolean>()

  constructor(@Inject(READONLY) readonly: boolean) {
    this.onReadonlyStateChange = this.readonlyStateChangeEvent.asObservable().pipe(distinctUntilChanged())
    this._readonly = readonly
  }
}
