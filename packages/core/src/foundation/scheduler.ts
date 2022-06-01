import { Injectable } from '@tanbo/di'
import { map, microTask, Observable, Subject, Subscription, tap } from '@tanbo/stream'

import { ComponentInstance, invokeListener, Operation } from '../model/_api'
import { RootComponentRef } from './_injection-tokens'
import { Renderer } from './renderer'
import { Selection } from './selection'

@Injectable()
export class Scheduler {
  stopBroadcastChanges = false
  onDocChange: Observable<Operation[]>

  get hasLocalUpdate() {
    return this._hasLocalUpdate
  }

  private _hasLocalUpdate = false
  private instanceList = new Set<ComponentInstance>()

  private docChangeEvent = new Subject<Operation[]>()
  private subs: Subscription[] = []

  constructor(private rootComponentRef: RootComponentRef,
              private selection: Selection,
              private renderer: Renderer) {
    this.onDocChange = this.docChangeEvent.asObservable()
  }

  remoteUpdateTransact(task: () => void) {
    if (!this.hasLocalUpdate) {
      task()
      this._hasLocalUpdate = false
    } else {
      task()
    }
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
        tap(() => {
          this._hasLocalUpdate = true
        }),
        map(op => {
          return this.stopBroadcastChanges ? null : op
        }),
        microTask()
      ).subscribe(ops => {
        this.renderer.render()
        this.selection.restore()
        this._hasLocalUpdate = false
        const operations = ops.filter(i => i)
        if (operations.length) {
          this.docChangeEvent.next(ops as Operation[])
        }
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
