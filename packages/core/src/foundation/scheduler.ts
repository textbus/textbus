import { Injectable } from '@tanbo/di'
import { map, microTask, Observable, Subject, Subscription } from '@tanbo/stream'
import { ComponentInstance, invokeListener, Operation } from '../model/_api'
import { RootComponentRef } from './_injection-tokens'
import { Renderer } from './renderer'
import { Selection } from './selection'

@Injectable()
export class Scheduler {
  ignoreChanges = false
  onDocChange: Observable<Operation[]>

  private instanceList = new Set<ComponentInstance>()

  private docChangeEvent = new Subject<Operation[]>()
  private subs: Subscription[] = []

  constructor(private rootComponentRef: RootComponentRef,
              private selection: Selection,
              private renderer: Renderer) {
    this.onDocChange = this.docChangeEvent.asObservable()
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
          return this.ignoreChanges ? null : op
        }),
        microTask()
      ).subscribe(ops => {
        this.renderer.render()
        this.selection.restore()
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
            const parent = comp.parent
            if (parent) {
              comp = parent.parent as ComponentInstance
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
