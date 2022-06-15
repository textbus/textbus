import { Injectable } from '@tanbo/di'
import { map, microTask, Observable, Subject, Subscription } from '@tanbo/stream'

import { ComponentInstance, invokeListener, Operation } from '../model/_api'
import { RootComponentRef } from './_injection-tokens'
import { Renderer } from './renderer'
import { Selection } from './selection'

export enum ChangeOrigin {
  History,
  Local,
  Remote
}

export interface ChangeItem {
  from: ChangeOrigin,
  operations: Operation
}

@Injectable()
export class Scheduler {
  get hasLocalUpdate() {
    return this._hasLocalUpdate
  }

  onDocChange: Observable<ChangeItem[]>

  private _hasLocalUpdate = true
  private changeFromRemote = false
  private changeFromHistory = false
  private instanceList = new Set<ComponentInstance>()

  private docChangeEvent = new Subject<ChangeItem[]>()
  private subs: Subscription[] = []

  constructor(private rootComponentRef: RootComponentRef,
              private selection: Selection,
              private renderer: Renderer) {
    this.onDocChange = this.docChangeEvent.asObservable()
  }

  remoteUpdateTransact(task: () => void) {
    this.changeFromRemote = true
    task()
    this.changeFromRemote = false
  }

  historyApplyTransact(task: () => void) {
    this.changeFromHistory = true
    task()
    this.changeFromHistory = false
  }

  run() {
    const rootComponent = this.rootComponentRef.component
    const changeMarker = rootComponent.changeMarker
    this.renderer.render()
    this.subs.push(
      changeMarker.onForceChange.pipe(microTask()).subscribe(() => {
        this.renderer.render()
      }),
      changeMarker.onChange.pipe(
        map(op => {
          return {
            from: this.changeFromRemote ? ChangeOrigin.Remote :
              this.changeFromHistory ? ChangeOrigin.History : ChangeOrigin.Local,
            operations: op
          }
        }),
        microTask()
      ).subscribe(ops => {
        this.renderer.render()
        this._hasLocalUpdate = ops.some(i => i.from === ChangeOrigin.Local)
        this.selection.restore(this._hasLocalUpdate)
        this.docChangeEvent.next(ops)
      }),
      changeMarker.onChildComponentRemoved.subscribe(instance => {
        this.instanceList.add(instance)
      }),
      this.renderer.onViewChecked.subscribe(() => {
        this.instanceList.forEach(instance => {
          let comp = instance
          while (comp) {
            const parent = comp.parentComponent
            if (parent) {
              comp = parent
            } else {
              break
            }
          }
          if (comp !== rootComponent) {
            Scheduler.invokeChildComponentDestroyHook(comp)
          }
        })
        this.instanceList.clear()
      })
    )
  }

  destroy() {
    this.subs.forEach(i => i.unsubscribe())
    this.subs = []
  }

  private static invokeChildComponentDestroyHook(parent: ComponentInstance) {
    parent.slots.toArray().forEach(slot => {
      slot.sliceContent().forEach(i => {
        if (typeof i !== 'string') {
          Scheduler.invokeChildComponentDestroyHook(i)
        }
      })
    })
    invokeListener(parent, 'onDestroy')
  }
}
