import { Injectable } from '@tanbo/di'
import { merge, microTask, Observable, Subject, Subscription } from '@tanbo/stream'
import {
  RootComponentRef,
  Starter,
  Translator,
  Registry,
  Selection,
  SelectionPaths,
  History, Renderer, Slot, ComponentInstance, makeError, Slots, Formats
} from '@textbus/core'
import {
  Doc as YDoc,
  Map as YMap,
  Text as YText,
  Array as YArray,
  UndoManager,
  Transaction
} from 'yjs'

import { CollaborateCursor, RemoteSelection } from './collab/_api'

const collaborateErrorFn = makeError('Collaborate')

@Injectable()
export class Collaborate implements History {
  onSelectionChange: Observable<SelectionPaths>
  yDoc = new YDoc()
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

  private subscriptions: Subscription[] = []
  private updateFromRemote = false

  private selectionChangeEvent = new Subject<SelectionPaths>()

  constructor(private rootComponentRef: RootComponentRef,
              private collaborateCursor: CollaborateCursor,
              private translator: Translator,
              private renderer: Renderer,
              private registry: Registry,
              private selection: Selection,
              private starter: Starter) {
    this.onSelectionChange = this.selectionChangeEvent.asObservable()
    this.onBack = this.backEvent.asObservable()
    this.onForward = this.forwardEvent.asObservable()
    this.onChange = this.changeEvent.asObservable()
    this.onPush = this.pushEvent.asObservable()
  }

  setup() {
    this.subscriptions.push(
      this.starter.onReady.subscribe(() => {
        this.listen2()
      }),
      this.selection.onChange.subscribe(() => {
        const paths = this.selection.getPaths()
        this.selectionChangeEvent.next(paths)
      })
    )
  }

  updateRemoteSelection(paths: RemoteSelection[]) {
    this.collaborateCursor.draw(paths)
  }

  listen() {
    //
  }

  back() {
    if (this.canBack) {
      this.manager.undo()
    }
  }

  forward() {
    if (this.canForward) {
      this.manager.redo()
    }
  }

  destroy() {
    this.subscriptions.forEach(i => i.unsubscribe())
  }

  private listen2() {
    const root = this.yDoc.getText('content')
    const rootComponent = this.rootComponentRef.component!
    this.manager = new UndoManager(root, {
      trackedOrigins: new Set<any>([this.yDoc])
    })
    this.syncContent(root, rootComponent.slots.get(0)!)

    this.subscriptions.push(
      merge(
        rootComponent.changeMarker.onForceChange,
        rootComponent.changeMarker.onChange
      ).pipe(
        microTask()
      ).subscribe(() => {
        this.renderer.render()
        this.selection.restore()
      })
    )
  }

  private syncContent(content: YText, slot: Slot) {
    content.observe((ev, tr) => {
      this.runRemoteUpdate(tr, () => {
        slot.retain(0)
        ev.delta.forEach(action => {
          if (Reflect.has(action, 'retain')) {
            if (action.attributes) {
              slot.retain(action.retain!, Object.keys(action.attributes).map(key => {
                return [this.registry.getFormatter(key)!, action.attributes![key]]
              }))
            }
            slot.retain(action.retain!)
          } else if (action.insert) {
            const index = slot.index
            let length = 1
            if (typeof action.insert === 'string') {
              length = action.insert.length
              const attrs: Formats = action.attributes ? Object.keys(action.attributes).map(key => {
                return [this.registry.getFormatter(key)!, action.attributes![key]]
              }) : []
              slot.insert(action.insert, attrs)
            } else {
              const sharedComponent = action.insert as YMap<any>
              const component = this.createComponentBySharedComponent(sharedComponent)
              this.syncSlots(sharedComponent.get('slots'), component.slots)
              this.syncComponent(sharedComponent, component)
              slot.insert(component)
            }
            if (this.selection.isSelected) {
              if (slot === this.selection.startSlot && this.selection.startOffset! >= index) {
                this.selection.setStart(slot, this.selection.startOffset! + length)
              }
              if (slot === this.selection.endSlot && this.selection.endOffset! >= index) {
                this.selection.setEnd(slot, this.selection.endOffset! + length)
              }
            }
          } else if (action.delete) {
            const index = slot.index
            slot.retain(slot.index)
            slot.delete(action.delete)
            if (this.selection.isSelected) {
              if (slot === this.selection.startSlot && this.selection.startOffset! >= index) {
                this.selection.setStart(slot, this.selection.startOffset! - action.delete)
              }
              if (slot === this.selection.endSlot && this.selection.endOffset! >= index) {
                this.selection.setEnd(slot, this.selection.endOffset! - action.delete)
              }
            }
          } else if (action.attributes) {
            slot.updateState(draft => {
              Object.assign(draft, action.attributes)
            })
          }
        })
      })
    })

    slot.onContentChange.subscribe(actions => {
      this.runLocalUpdate(() => {
        let offset = 0
        let length = 0
        for (const action of actions) {
          if (action.type === 'retain') {
            if (action.formats) {
              content.format(offset, action.offset, action.formats)
            } else {
              offset = action.offset
            }
          } else if (action.type === 'insert') {
            const delta = content.toDelta()
            const isEmpty = delta.length === 1 && delta[0].insert === Slot.emptyPlaceholder
            if (typeof action.content === 'string') {
              length = action.content.length
              content.insert(offset, action.content)
            } else {
              length = 1
              const component = slot.getContentAtIndex(offset) as ComponentInstance
              const sharedComponent = this.createSharedComponentByComponent(component)
              content.insertEmbed(offset, sharedComponent)
            }
            if (action.formats) {
              content.format(offset, length, action.formats)
            }
            if (isEmpty && offset === 0) {
              content.delete(content.length - 1, 1)
            }
            offset += length
          } else if (action.type === 'delete') {
            const delta = content.toDelta()
            content.delete(offset, action.count)
            if (content.length === 0) {
              content.insert(0, '\n', delta[0]?.attributes)
            }
          }
        }
      })
    })
  }

  private syncSlot(remoteSlot: YMap<any>, slot: Slot) {
    remoteSlot.observe((ev, tr) => {
      this.runRemoteUpdate(tr, () => {
        ev.keysChanged.forEach(key => {
          if (key === 'state') {
            const state = (ev.target as YMap<any>).get('state')
            slot.updateState(draft => {
              Object.assign(draft, state)
            })
          }
        })
      })
    })

    slot.onStateChange.subscribe(actions => {
      this.runLocalUpdate(() => {
        actions.forEach(action => {
          remoteSlot.set('state', action.value)
        })
      })
    })
  }

  private syncSlots(remoteSlots: YArray<any>, slots: Slots) {
    remoteSlots.observe((ev, tr) => {
      this.runRemoteUpdate(tr, () => {
        ev.delta.forEach(action => {
          if (Reflect.has(action, 'retain')) {
            slots.retain(action.retain!)
          } else if (action.insert) {
            (action.insert as Array<YMap<any>>).forEach(item => {
              const slot = this.createSlotBySharedSlot(item)
              slots.insert(slot)
              this.syncContent(item.get('content'), slot)
              this.syncSlot(item, slot)
            })
          } else if (action.delete) {
            slots.retain(slots.index)
            slots.delete(action.delete)
          }
        })
      })
    })

    slots.onChange.subscribe(operations => {
      this.runLocalUpdate(() => {
        const applyActions = operations.apply
        let index: number
        applyActions.forEach(action => {
          if (action.type === 'retain') {
            index = action.offset
          } else if (action.type === 'insertSlot') {
            const slot = slots.get(index)!
            const sharedSlot = this.createSharedSlotBySlot(slot)
            remoteSlots.insert(index, [sharedSlot])
            index++
          } else if (action.type === 'delete') {
            remoteSlots.delete(index, action.count)
          }
        })
      })
    })
  }

  private syncComponent(remoteComponent: YMap<any>, component: ComponentInstance) {
    remoteComponent.observe((ev, tr) => {
      this.runRemoteUpdate(tr, () => {
        ev.keysChanged.forEach(key => {
          if (key === 'state') {
            const state = (ev.target as YMap<any>).get('state')
            component.updateState(draft => {
              Object.assign(draft, state)
            })
          }
        })
      })
    })

    component.onStateChange.subscribe(newState => {
      this.runLocalUpdate(() => {
        remoteComponent.set('state', newState)
      })
    })
  }

  private runLocalUpdate(fn: () => void) {
    if (this.updateFromRemote) {
      return
    }
    fn()
  }

  private runRemoteUpdate(tr: Transaction, fn: () => void) {
    if (!tr.origin) {
      return
    }
    this.updateFromRemote = true
    fn()
    this.updateFromRemote = false
  }

  private createSharedComponentByComponent(component: ComponentInstance): YMap<any> {
    const sharedComponent = new YMap()
    sharedComponent.set('state', component.state)
    sharedComponent.set('name', component.name)
    const sharedSlots = new YArray()
    sharedComponent.set('slots', sharedSlots)
    component.slots.toArray().forEach(slot => {
      const sharedSlot = this.createSharedSlotBySlot(slot)
      sharedSlots.push([sharedSlot])
    })
    this.syncSlots(sharedSlots, component.slots)
    this.syncComponent(sharedComponent, component)
    return sharedComponent
  }

  private createSharedSlotBySlot(slot: Slot): YMap<any> {
    const sharedSlot = new YMap()
    sharedSlot.set('schema', slot.schema)
    sharedSlot.set('state', slot.state)
    const sharedContent = new YText()
    sharedSlot.set('content', sharedContent)
    let offset = 0
    slot.toDelta().forEach(i => {
      let formats: any = {}
      if (i.formats) {
        i.formats.forEach(item => {
          formats[item[0].name] = item[1]
        })
      } else {
        formats = null
      }
      if (typeof i.insert === 'string') {
        sharedContent.insert(offset, i.insert, formats)
      } else {
        const sharedComponent = this.createSharedComponentByComponent(i.insert)
        sharedContent.insertEmbed(offset, sharedComponent, formats)
      }
      offset += i.insert.length
    })
    this.syncContent(sharedContent, slot)
    this.syncSlot(sharedSlot, slot)
    return sharedSlot
  }

  private createComponentBySharedComponent(yMap: YMap<any>): ComponentInstance {
    const sharedSlots = yMap.get('slots') as YArray<YMap<any>>
    const slots: Slot[] = []
    sharedSlots.map(sharedSlot => {
      const slot = this.createSlotBySharedSlot(sharedSlot)
      slots.push(slot)
    })
    const name = yMap.get('name')
    const instance = this.translator.createComponentByData(name, {
      state: yMap.get('state'),
      slots
    })
    if (instance) {
      instance.slots.toArray().forEach((slot, index) => {
        const sharedSlot = sharedSlots.get(index)
        this.syncSlot(sharedSlot, slot)
        this.syncContent(sharedSlot.get('content'), slot)
      })
      return instance
    }
    throw collaborateErrorFn(`cannot find component factory \`${name}\`.`)
  }

  private createSlotBySharedSlot(sharedSlot: YMap<any>): Slot {
    const content = sharedSlot.get('content') as YText
    const delta = content.toDelta()

    const slot = this.translator.createSlot({
      schema: sharedSlot.get('schema'),
      state: sharedSlot.get('state'),
      formats: {},
      content: []
    })

    for (const action of delta) {
      if (action.insert) {
        if (typeof action.insert === 'string') {
          slot.insert(action.insert, action.attributes ? Object.keys(action.attributes).map(key => {
            return [this.registry.getFormatter(key)!, action.attributes![key]]
          }) : [])
        } else {
          const sharedComponent = action.insert as YMap<any>
          const component = this.createComponentBySharedComponent(sharedComponent)
          slot.insert(component)
          this.syncSlots(sharedComponent.get('slots'), component.slots)
          this.syncComponent(sharedComponent, component)
        }
      } else {
        throw collaborateErrorFn('unexpected delta action.')
      }
    }
    return slot
  }
}
