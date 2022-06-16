import { Inject, Injectable } from '@tanbo/di'
import { delay, filter, map, Observable, Subject, Subscription } from '@tanbo/stream'
import {
  ChangeOrigin,
  ComponentInstance,
  ContentType, Controller,
  Formats,
  History, HISTORY_STACK_SIZE,
  makeError,
  Registry,
  RootComponentRef,
  Scheduler,
  Selection,
  SelectionPaths,
  Slot,
  Starter,
  Translator
} from '@textbus/core'
import { Array as YArray, Doc as YDoc, Map as YMap, Text as YText, Transaction, UndoManager } from 'yjs'

import { CollaborateCursor, RemoteSelection } from './collaborate-cursor'
import { createUnknownComponent } from './unknown.component'

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

  private contentSyncCaches = new WeakMap<Slot, () => void>()
  private slotStateSyncCaches = new WeakMap<Slot, () => void>()
  private slotsSyncCaches = new WeakMap<ComponentInstance, () => void>()
  private componentStateSyncCaches = new WeakMap<ComponentInstance, () => void>()

  private selectionChangeEvent = new Subject<SelectionPaths>()

  private updateRemoteActions: Array<() => void> = []

  constructor(@Inject(HISTORY_STACK_SIZE) private stackSize: number,
              private rootComponentRef: RootComponentRef,
              private collaborateCursor: CollaborateCursor,
              private controller: Controller,
              private scheduler: Scheduler,
              private translator: Translator,
              private registry: Registry,
              private selection: Selection,
              private starter: Starter) {
    this.onSelectionChange = this.selectionChangeEvent.asObservable().pipe(delay())
    this.onBack = this.backEvent.asObservable()
    this.onForward = this.forwardEvent.asObservable()
    this.onChange = this.changeEvent.asObservable()
    this.onPush = this.pushEvent.asObservable()
  }

  setup() {
    this.subscriptions.push(
      this.selection.onChange.subscribe(() => {
        const paths = this.selection.getPaths()
        this.selectionChangeEvent.next(paths)
      })
    )
    this.syncRootComponent()
  }

  updateRemoteSelection(paths: RemoteSelection[]) {
    this.collaborateCursor.draw(paths)
  }

  listen() {
    //
  }

  back() {
    if (this.canBack) {
      this.scheduler.historyApplyTransact(() => {
        this.selection.unSelect()
        this.manager.undo()
      })
    }
  }

  forward() {
    if (this.canForward) {
      this.scheduler.historyApplyTransact(() => {
        this.selection.unSelect()
        this.manager.redo()
      })
    }
  }

  destroy() {
    this.subscriptions.forEach(i => i.unsubscribe())
    this.collaborateCursor.destroy()
    this.manager.destroy()
  }

  private syncRootComponent() {
    const root = this.yDoc.getText('content')
    const rootComponent = this.rootComponentRef.component!
    this.manager = new UndoManager(root, {
      trackedOrigins: new Set<any>([this.yDoc])
    })
    this.manager.on('stack-item-added', () => {
      if (this.manager.undoStack.length > this.stackSize) {
        this.manager.undoStack.shift()
      }
    })
    this.syncContent(root, rootComponent.slots.get(0)!)

    this.subscriptions.push(
      this.scheduler.onDocChange.pipe(
        map(item => {
          return item.filter(i => {
            return i.from === ChangeOrigin.Local
          })
        }),
        filter(item => {
          return item.length
        })
      ).subscribe(() => {
        this.yDoc.transact(() => {
          this.updateRemoteActions.forEach(fn => {
            fn()
          })
          this.updateRemoteActions = []
        }, this.yDoc)
      })
    )
  }

  private syncContent(content: YText, slot: Slot) {
    const syncRemote = (ev, tr) => {
      this.runRemoteUpdate(tr, () => {
        slot.retain(0)
        ev.delta.forEach(action => {
          if (Reflect.has(action, 'retain')) {
            if (action.attributes) {
              const formats = makeFormats(this.registry, action.attributes)
              if (formats.length) {
                slot.retain(action.retain!, formats)
              }
            } else {
              slot.retain(action.retain)
            }
          } else if (action.insert) {
            const index = slot.index
            let length = 1
            if (typeof action.insert === 'string') {
              length = action.insert.length
              slot.insert(action.insert, makeFormats(this.registry, action.attributes))
            } else {
              const sharedComponent = action.insert as YMap<any>
              const canInsertInlineComponent = slot.schema.includes(ContentType.InlineComponent)
              const component = this.createComponentBySharedComponent(sharedComponent, canInsertInlineComponent)
              this.syncSlots(sharedComponent.get('slots'), component)
              this.syncComponent(sharedComponent, component)
              slot.insert(component)
            }
            if (this.selection.isSelected) {
              if (slot === this.selection.anchorSlot && this.selection.anchorOffset! > index) {
                this.selection.setAnchor(slot, this.selection.anchorOffset! + length)
              }
              if (slot === this.selection.focusSlot && this.selection.focusOffset! > index) {
                this.selection.setFocus(slot, this.selection.focusOffset! + length)
              }
            }
          } else if (action.delete) {
            const index = slot.index
            slot.retain(slot.index)
            slot.delete(action.delete)
            if (this.selection.isSelected) {
              if (slot === this.selection.anchorSlot && this.selection.anchorOffset! >= index) {
                this.selection.setAnchor(slot, this.selection.startOffset! - action.delete)
              }
              if (slot === this.selection.focusSlot && this.selection.focusOffset! >= index) {
                this.selection.setFocus(slot, this.selection.focusOffset! - action.delete)
              }
            }
          } else if (action.attributes) {
            slot.updateState(draft => {
              Object.assign(draft, action.attributes)
            })
          }
        })
      })
    }
    content.observe(syncRemote)

    const sub = slot.onContentChange.subscribe(actions => {
      this.runLocalUpdate(() => {
        let offset = 0
        let length = 0
        for (const action of actions) {
          if (action.type === 'retain') {
            const formats = action.formats
            if (formats) {
              const keys = Object.keys(formats)
              let length = keys.length
              keys.forEach(key => {
                if (!this.registry.getFormatter(key)) {
                  length--
                  Reflect.deleteProperty(formats, key)
                }
              })
              if (length) {
                content.format(offset, action.offset, formats)
              }
            } else {
              offset = action.offset
            }
          } else if (action.type === 'insert') {
            const delta = content.toDelta()
            const isEmpty = delta.length === 1 && delta[0].insert === Slot.emptyPlaceholder
            if (typeof action.content === 'string') {
              length = action.content.length
              content.insert(offset, action.content, action.formats || {})
            } else {
              length = 1
              const component = slot.getContentAtIndex(offset) as ComponentInstance
              const sharedComponent = this.createSharedComponentByComponent(component)
              content.insertEmbed(offset, sharedComponent)
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

    sub.add(slot.onChildComponentRemove.subscribe(components => {
      components.forEach(c => {
        this.cleanSubscriptionsByComponent(c)
      })
    }))
    this.contentSyncCaches.set(slot, () => {
      content.unobserve(syncRemote)
      sub.unsubscribe()
    })
  }

  private syncSlot(remoteSlot: YMap<any>, slot: Slot) {
    const syncRemote = (ev, tr) => {
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
    }
    remoteSlot.observe(syncRemote)

    const sub = slot.onStateChange.subscribe(actions => {
      this.runLocalUpdate(() => {
        actions.forEach(action => {
          remoteSlot.set('state', action.value)
        })
      })
    })
    this.slotStateSyncCaches.set(slot, () => {
      remoteSlot.unobserve(syncRemote)
      sub.unsubscribe()
    })
  }

  private syncSlots(remoteSlots: YArray<any>, component: ComponentInstance) {
    const slots = component.slots
    const syncRemote = (ev, tr) => {
      this.runRemoteUpdate(tr, () => {
        let index = 0
        ev.delta.forEach(action => {
          if (Reflect.has(action, 'retain')) {
            index += action.retain
            slots.retain(index)
          } else if (action.insert) {
            (action.insert as Array<YMap<any>>).forEach(item => {
              const slot = this.createSlotBySharedSlot(item)
              slots.insert(slot)
              this.syncContent(item.get('content'), slot)
              this.syncSlot(item, slot)
              index++
            })
          } else if (action.delete) {
            slots.retain(index)
            slots.delete(action.delete)
          }
        })
      })
    }
    remoteSlots.observe(syncRemote)

    const sub = slots.onChange.subscribe(operations => {
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

    sub.add(slots.onChildSlotRemove.subscribe(slots => {
      slots.forEach(slot => {
        this.cleanSubscriptionsBySlot(slot)
      })
    }))

    this.slotsSyncCaches.set(component, () => {
      remoteSlots.unobserve(syncRemote)
      sub.unsubscribe()
    })
  }

  private syncComponent(remoteComponent: YMap<any>, component: ComponentInstance) {
    const syncRemote = (ev, tr) => {
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
    }
    remoteComponent.observe(syncRemote)

    const sub = component.onStateChange.subscribe(newState => {
      this.runLocalUpdate(() => {
        remoteComponent.set('state', newState)
      })
    })
    this.componentStateSyncCaches.set(component, () => {
      remoteComponent.unobserve(syncRemote)
      sub.unsubscribe()
    })
  }

  private runLocalUpdate(fn: () => void) {
    if (this.updateFromRemote || this.controller.readonly) {
      return
    }
    this.updateRemoteActions.push(fn)
  }

  private runRemoteUpdate(tr: Transaction, fn: () => void) {
    if (tr.origin === this.yDoc) {
      return
    }
    this.updateFromRemote = true
    this.scheduler.remoteUpdateTransact(fn)
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
    this.syncSlots(sharedSlots, component)
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

  private createComponentBySharedComponent(yMap: YMap<any>, canInsertInlineComponent: boolean): ComponentInstance {
    const sharedSlots = yMap.get('slots') as YArray<YMap<any>>
    const slots: Slot[] = []
    sharedSlots.forEach(sharedSlot => {
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
        let sharedSlot = sharedSlots.get(index)
        if (!sharedSlot) {
          sharedSlot = this.createSharedSlotBySlot(slot)
          sharedSlots.push([sharedSlot])
        }
        this.syncSlot(sharedSlot, slot)
        this.syncContent(sharedSlot.get('content'), slot)
      })
      return instance
    }
    return createUnknownComponent(name, canInsertInlineComponent).createInstance(this.starter)
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
          slot.insert(action.insert, makeFormats(this.registry, action.attributes))
        } else {
          const sharedComponent = action.insert as YMap<any>
          const canInsertInlineComponent = slot.schema.includes(ContentType.InlineComponent)
          const component = this.createComponentBySharedComponent(sharedComponent, canInsertInlineComponent)
          slot.insert(component)
          this.syncSlots(sharedComponent.get('slots'), component)
          this.syncComponent(sharedComponent, component)
        }
      } else {
        throw collaborateErrorFn('unexpected delta action.')
      }
    }
    return slot
  }

  private cleanSubscriptionsBySlot(slot: Slot) {
    [this.contentSyncCaches.get(slot), this.slotStateSyncCaches.get(slot)].forEach(fn => {
      if (fn) {
        fn()
      }
    })
    slot.sliceContent().forEach(i => {
      if (typeof i !== 'string') {
        this.cleanSubscriptionsByComponent(i)
      }
    })
  }

  private cleanSubscriptionsByComponent(component: ComponentInstance) {
    [this.slotsSyncCaches.get(component), this.componentStateSyncCaches.get(component)].forEach(fn => {
      if (fn) {
        fn()
      }
    })
    component.slots.toArray().forEach(slot => {
      this.cleanSubscriptionsBySlot(slot)
    })
  }
}

function makeFormats(registry: Registry, attrs?: any) {
  const formats: Formats = []
  if (attrs) {
    Object.keys(attrs).forEach(key => {
      const formatter = registry.getFormatter(key)
      if (formatter) {
        formats.push([formatter, attrs[key]])
      }
    })
  }
  return formats
}
