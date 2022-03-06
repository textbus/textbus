import { Injectable } from '@tanbo/di'
import { History } from '@textbus/core'
import { Observable, Subject } from '@tanbo/stream'
import { UndoManager, Array as YArray } from 'yjs'

@Injectable()
export class CollaborateHistory implements History {
  onBack: Observable<void>
  onForward: Observable<void>
  onChange: Observable<any>
  onPush: Observable<void>

  get canBack() {
    return this.manager?.canUndo()
  }

  get canForward() {
    return this.manager?.canRedo()
  }


  private backEvent = new Subject<void>()
  private forwardEvent = new Subject<void>()
  private changeEvent = new Subject<void>()
  private pushEvent = new Subject<void>()

  private manager!: UndoManager

  constructor() {
    this.onBack = this.backEvent.asObservable()
    this.onForward = this.forwardEvent.asObservable()
    this.onChange = this.changeEvent.asObservable()
    this.onPush = this.pushEvent.asObservable()
  }

  init(yArray: YArray<any>) {
    this.manager = new UndoManager(yArray)
  }

  listen() {
    //
  }

  back() {
    //
  }

  forward() {
    //
  }

  destroy() {
    //
  }
}
