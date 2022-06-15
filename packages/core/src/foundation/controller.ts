import { Inject, Injectable } from '@tanbo/di'
import { distinctUntilChanged, Observable, Subject } from '@tanbo/stream'
import { READONLY } from './_injection-tokens'

@Injectable()
export class Controller {
  onReadonlyStateChange: Observable<boolean>

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
