import { Inject, Injectable, Optional } from '@viewfly/core'
import { filter, map, Observable, Subject, Subscription } from '@tanbo/stream'
import {
  AbstractSelection,
  ChangeOrigin,
  Component,
  Registry,
  Formats,
  History,
  HISTORY_STACK_SIZE,
  makeError,
  RootComponentRef,
  Scheduler,
  Selection,
  SelectionPaths,
  Slot
} from '@textbus/core'
import {
  Array as YArray,
  Doc as YDoc,
  Map as YMap,
  RelativePosition,
  Text as YText,
  Transaction,
  UndoManager,
  createAbsolutePositionFromRelativePosition,
  createRelativePositionFromTypeIndex,
  Item
} from 'yjs'

const collaborateErrorFn = makeError('Collaborate')

interface CursorPosition {
  anchor: RelativePosition
  focus: RelativePosition
}

class ContentMap {
  private slotAndYTextMap = new WeakMap<Slot, YText>()
  private yTextAndSLotMap = new WeakMap<YText, Slot>()

  set(key: Slot, value: YText): void
  set(key: YText, value: Slot): void
  set(key: any, value: any) {
    if (key instanceof Slot) {
      this.slotAndYTextMap.set(key, value)
      this.yTextAndSLotMap.set(value, key)
    } else {
      this.slotAndYTextMap.set(value, key)
      this.yTextAndSLotMap.set(key, value)
    }
  }

  get(key: Slot): YText | null
  get(key: YText): Slot | null
  get(key: any) {
    if (key instanceof Slot) {
      return this.slotAndYTextMap.get(key) || null
    }
    return this.yTextAndSLotMap.get(key) || null
  }

  delete(key: Slot | YText) {
    if (key instanceof Slot) {
      const v = this.slotAndYTextMap.get(key)
      this.slotAndYTextMap.delete(key)
      if (v) {
        this.yTextAndSLotMap.delete(v)
      }
    } else {
      const v = this.yTextAndSLotMap.get(key)
      this.yTextAndSLotMap.delete(key)
      if (v) {
        this.slotAndYTextMap.delete(v)
      }
    }
  }
}

interface Update {
  record: boolean
  actions: Array<() => void>
}

interface UpdateItem {
  record: boolean

  action(): void
}

export abstract class CustomUndoManagerConfig {
  abstract captureTransaction?(arg0: Transaction): boolean

  abstract deleteFilter?(arg0: Item): boolean
}

interface CollaborateHistorySelectionPosition {
  before: CursorPosition | null
  after: CursorPosition | null
}

@Injectable()
export class Collaborate implements History {
  onLocalChangesApplied: Observable<void>
  yDoc = new YDoc()
  onBack: Observable<void>
  onForward: Observable<void>
  onChange: Observable<void>
  onPush: Observable<void>

  get canBack() {
    return this.manager?.canUndo() || false
  }

  get canForward() {
    return this.manager?.canRedo() || false
  }

  protected backEvent = new Subject<void>()
  protected forwardEvent = new Subject<void>()
  protected changeEvent = new Subject<void>()
  protected pushEvent = new Subject<void>()

  protected manager: UndoManager | null = null

  protected subscriptions: Subscription[] = []
  protected updateFromRemote = false

  protected contentSyncCaches = new WeakMap<Slot, () => void>()
  protected slotStateSyncCaches = new WeakMap<Slot, () => void>()
  protected slotsSyncCaches = new WeakMap<Component, () => void>()
  protected componentStateSyncCaches = new WeakMap<Component, () => void>()

  protected localChangesAppliedEvent = new Subject<void>()
  protected selectionChangeEvent = new Subject<SelectionPaths>()
  protected contentMap = new ContentMap()

  protected updateRemoteActions: Array<UpdateItem> = []
  protected noRecord = {}

  protected historyItems: Array<CollaborateHistorySelectionPosition> = []
  protected index = 0

  constructor(@Inject(HISTORY_STACK_SIZE) protected stackSize: number,
              protected rootComponentRef: RootComponentRef,
              protected scheduler: Scheduler,
              protected registry: Registry,
              protected selection: Selection,
              @Optional() protected undoManagerConfig: CustomUndoManagerConfig) {
    this.onBack = this.backEvent.asObservable()
    this.onForward = this.forwardEvent.asObservable()
    this.onChange = this.changeEvent.asObservable()
    this.onPush = this.pushEvent.asObservable()
    this.onLocalChangesApplied = this.localChangesAppliedEvent.asObservable()
  }

  listen() {
    const root = this.yDoc.getMap('RootComponent')
    const rootComponent = this.rootComponentRef.component!
    const undoManagerConfig = this.undoManagerConfig || {}
    const manager = new UndoManager(root, {
      trackedOrigins: new Set<any>([this.yDoc]),
      captureTransaction(arg) {
        if (undoManagerConfig.captureTransaction) {
          return undoManagerConfig.captureTransaction(arg)
        }
        return true
      },
      deleteFilter(item: Item) {
        if (undoManagerConfig.deleteFilter) {
          return undoManagerConfig.deleteFilter(item)
        }
        return true
      }
    })
    this.manager = manager

    let beforePosition: CursorPosition | null = null
    this.subscriptions.push(
      this.scheduler.onLocalChangeBefore.subscribe(() => {
        beforePosition = this.getRelativeCursorLocation()
      })
    )

    manager.on('stack-item-added', event => {
      if (event.type === 'undo') {
        if (event.origin === manager) {
          this.index++
        } else {
          this.historyItems.length = this.index
          this.historyItems.push({
            before: beforePosition,
            after: this.getRelativeCursorLocation()
          })
          this.index++
        }
      } else {
        this.index--
      }
      if (manager.undoStack.length > this.stackSize) {
        this.historyItems.shift()
        manager.undoStack.shift()
      }
      if (event.origin === this.yDoc) {
        this.pushEvent.next()
      }
      this.changeEvent.next()
    })
    manager.on('stack-item-popped', (ev) => {
      const index = ev.type === 'undo' ? this.index : this.index - 1
      const position = this.historyItems[index] || null
      const p = ev.type === 'undo' ? position?.before : position?.after
      if (p) {
        const selection = this.getAbstractSelection(p)
        if (selection) {
          this.selection.setBaseAndExtent(
            selection.anchorSlot,
            selection.anchorOffset,
            selection.focusSlot,
            selection.focusOffset)
          return
        }
      }
      this.selection.unSelect()
    })
    this.subscriptions.push(
      this.selection.onChange.subscribe(() => {
        const paths = this.selection.getPaths()
        this.selectionChangeEvent.next(paths)
      }),
      this.scheduler.onDocChanged.pipe(
        map(item => {
          return item.filter(i => {
            return i.from !== ChangeOrigin.Remote
          })
        }),
        filter(item => {
          return item.length
        })
      ).subscribe(() => {
        const updates: Update[] = []

        let update: Update | null = null

        for (const item of this.updateRemoteActions) {
          if (!update) {
            update = {
              record: item.record,
              actions: []
            }
            updates.push(update)
          }
          if (update.record === item.record) {
            update.actions.push(item.action)
          } else {
            update = {
              record: item.record,
              actions: [item.action]
            }
            updates.push(update)
          }
        }

        this.updateRemoteActions = []

        for (const item of updates) {
          this.yDoc.transact(() => {
            item.actions.forEach(fn => {
              fn()
            })
          }, item.record ? this.yDoc : this.noRecord)
        }
        this.localChangesAppliedEvent.next()
      })
    )
    this.syncRootComponent(root, rootComponent)
  }

  back() {
    if (this.canBack) {
      this.manager?.undo()
      this.backEvent.next()
    }
  }

  forward() {
    if (this.canForward) {
      this.manager?.redo()
      this.forwardEvent.next()
    }
  }

  clear() {
    const last = this.historyItems.pop()
    this.historyItems = last ? [last] : []
    this.index = last ? 1 : 0
    this.manager?.clear()
    this.changeEvent.next()
  }

  destroy() {
    this.index = 0
    this.historyItems = []
    this.subscriptions.forEach(i => i.unsubscribe())
    this.manager?.destroy()
  }

  protected syncRootComponent(root: YMap<any>, rootComponent: Component) {
    let slots = root.get('slots') as YArray<YMap<any>>
    if (!slots) {
      slots = new YArray()
      rootComponent.__slots__.toArray().forEach(i => {
        const sharedSlot = this.createSharedSlotBySlot(i)
        slots.push([sharedSlot])
      })
      this.yDoc.transact(() => {
        root.set('state', rootComponent.state)
        root.set('slots', slots)
      })
    } else if (slots.length === 0) {
      rootComponent.updateState(() => {
        return root.get('state')
      })
      this.yDoc.transact(() => {
        rootComponent.__slots__.toArray().forEach(i => {
          const sharedSlot = this.createSharedSlotBySlot(i)
          slots.push([sharedSlot])
        })
      })
    } else {
      rootComponent.updateState(() => {
        return root.get('state')
      })
      rootComponent.__slots__.clean()
      slots.forEach(sharedSlot => {
        const slot = this.createSlotBySharedSlot(sharedSlot)
        this.syncSlotContent(sharedSlot.get('content'), slot)
        this.syncSlotState(sharedSlot, slot)
        rootComponent.__slots__.insert(slot)
      })
    }
    this.syncComponentState(root, rootComponent)
    this.syncComponentSlots(slots, rootComponent)
  }

  protected getAbstractSelection(position: CursorPosition): AbstractSelection | null {
    const anchorPosition = createAbsolutePositionFromRelativePosition(position.anchor, this.yDoc)
    const focusPosition = createAbsolutePositionFromRelativePosition(position.focus, this.yDoc)
    if (anchorPosition && focusPosition) {
      const focusSlot = this.contentMap.get(focusPosition.type as YText)
      const anchorSlot = this.contentMap.get(anchorPosition.type as YText)
      if (focusSlot && anchorSlot) {
        return {
          anchorSlot,
          anchorOffset: anchorPosition.index,
          focusSlot,
          focusOffset: focusPosition.index
        }
      }
    }
    return null
  }

  protected getRelativeCursorLocation(): CursorPosition | null {
    const { anchorSlot, anchorOffset, focusSlot, focusOffset } = this.selection
    if (anchorSlot) {
      const anchorYText = this.contentMap.get(anchorSlot)
      if (anchorYText) {
        const anchorPosition = createRelativePositionFromTypeIndex(anchorYText, anchorOffset!)
        if (focusSlot) {
          const focusYText = this.contentMap.get(focusSlot)
          if (focusYText) {
            const focusPosition = createRelativePositionFromTypeIndex(focusYText, focusOffset!)
            return {
              focus: focusPosition,
              anchor: anchorPosition
            }
          }
        }
      }
    }
    return null
  }

  protected syncSlotContent(content: YText, slot: Slot) {
    this.contentMap.set(slot, content)
    const syncRemote = (ev, tr) => {
      this.runRemoteUpdate(tr, () => {
        slot.retain(0)
        ev.keysChanged.forEach(key => {
          const change = ev.keys.get(key)
          if (!change) {
            return
          }
          const updateType = change.action
          if (updateType === 'update' || updateType === 'add') {
            const attribute = this.registry.getAttribute(key)
            if (attribute) {
              slot.setAttribute(attribute, content.getAttribute(key))
            }
          } else if (updateType === 'delete') {
            const attribute = this.registry.getAttribute(key)
            if (attribute) {
              slot.removeAttribute(attribute)
            }
          }
        })
        ev.delta.forEach(action => {
          if (Reflect.has(action, 'retain')) {
            if (action.attributes) {
              const formats = remoteFormatsToLocal(this.registry, action.attributes)
              if (formats.length) {
                slot.retain(action.retain!, formats)
              }
              slot.retain(slot.index + action.retain)
            } else {
              slot.retain(action.retain)
            }
          } else if (action.insert) {
            const index = slot.index
            let length = 1
            if (typeof action.insert === 'string') {
              length = action.insert.length
              slot.insert(action.insert, remoteFormatsToLocal(this.registry, action.attributes))
            } else {
              const sharedComponent = action.insert as YMap<any>
              const component = this.createComponentBySharedComponent(sharedComponent)
              this.syncComponentSlots(sharedComponent.get('slots'), component)
              this.syncComponentState(sharedComponent, component)
              slot.insert(component)
            }
            if (this.selection.isSelected && tr.origin !== this.manager) {
              if (slot === this.selection.anchorSlot && this.selection.anchorOffset! > index) {
                this.selection.setAnchor(slot, this.selection.anchorOffset! + length)
              }
              if (slot === this.selection.focusSlot && this.selection.focusOffset! > index) {
                this.selection.setFocus(slot, this.selection.focusOffset! + length)
              }
            }
          } else if (action.delete) {
            const index = slot.index
            slot.delete(action.delete)
            if (this.selection.isSelected && tr.origin !== this.manager) {
              if (slot === this.selection.anchorSlot && this.selection.anchorOffset! >= index) {
                this.selection.setAnchor(slot, this.selection.startOffset! - action.delete)
              }
              if (slot === this.selection.focusSlot && this.selection.focusOffset! >= index) {
                this.selection.setFocus(slot, this.selection.focusOffset! - action.delete)
              }
            }
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
                const formatter = this.registry.getFormatter(key)
                if (!formatter) {
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
              const sharedComponent = this.createSharedComponentByComponent(action.ref as Component)
              content.insertEmbed(offset, sharedComponent, action.formats || {})
            }

            if (isEmpty && offset === 0) {
              content.delete(content.length - 1, 1)
            }
            offset += length
          } else if (action.type === 'delete') {
            const delta = content.toDelta()
            if (content.length) {
              content.delete(offset, action.count)
            }
            if (content.length === 0) {
              content.insert(0, '\n', delta[0]?.attributes)
            }
          } else if (action.type === 'attrSet') {
            content.setAttribute(action.name, action.value)
          } else if (action.type === 'attrRemove') {
            content.removeAttribute(action.name)
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

  protected syncSlotState(remoteSlot: YMap<any>, slot: Slot) {
    const syncRemote = (ev, tr) => {
      this.runRemoteUpdate(tr, () => {
        ev.keysChanged.forEach(key => {
          if (key === 'state') {
            const state = (ev.target as YMap<any>).get('state')
            slot.updateState(draft => {
              if (typeof draft === 'object' && draft !== null) {
                Object.assign(draft, state)
              } else {
                return state
              }
            })
          }
        })
      })
    }
    remoteSlot.observe(syncRemote)

    const sub = slot.onStateChange.subscribe(change => {
      this.runLocalUpdate(() => {
        remoteSlot.set('state', change.newState)
      }, change.record)
    })
    this.slotStateSyncCaches.set(slot, () => {
      remoteSlot.unobserve(syncRemote)
      sub.unsubscribe()
    })
  }

  protected syncComponentSlots(remoteSlots: YArray<any>, component: Component) {
    const slots = component.__slots__
    const syncRemote = (ev, tr) => {
      this.runRemoteUpdate(tr, () => {
        let index = 0
        slots.retain(index)
        ev.delta.forEach(action => {
          if (Reflect.has(action, 'retain')) {
            index += action.retain
            slots.retain(index)
          } else if (action.insert) {
            (action.insert as Array<YMap<any>>).forEach(item => {
              const slot = this.createSlotBySharedSlot(item)
              slots.insert(slot)
              this.syncSlotContent(item.get('content'), slot)
              this.syncSlotState(item, slot)
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
            const sharedSlot = this.createSharedSlotBySlot(action.ref)
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

  protected syncComponentState(remoteComponent: YMap<any>, component: Component) {
    const syncRemote = (ev, tr) => {
      this.runRemoteUpdate(tr, () => {
        ev.keysChanged.forEach(key => {
          if (key === 'state') {
            const state = (ev.target as YMap<any>).get('state')
            component.updateState(draft => {
              if (typeof draft === 'object' && draft !== null) {
                Object.assign(draft, state)
              } else {
                return state
              }
            })
          }
        })
      })
    }
    remoteComponent.observe(syncRemote)

    const sub = component.onStateChange.subscribe(change => {
      this.runLocalUpdate(() => {
        remoteComponent.set('state', change.newState)
      }, change.record)
    })
    this.componentStateSyncCaches.set(component, () => {
      remoteComponent.unobserve(syncRemote)
      sub.unsubscribe()
    })
  }

  protected runLocalUpdate(fn: () => void, record = true) {
    if (this.updateFromRemote) {
      return
    }
    this.updateRemoteActions.push({
      record,
      action: fn
    })
  }

  protected runRemoteUpdate(tr: Transaction, fn: () => void) {
    if (tr.origin === this.yDoc) {
      return
    }
    this.updateFromRemote = true
    if (tr.origin === this.manager) {
      this.scheduler.historyApplyTransact(fn)
    } else {
      this.scheduler.remoteUpdateTransact(fn)
    }
    this.updateFromRemote = false
  }

  protected createSharedComponentByComponent(component: Component): YMap<any> {
    const sharedComponent = new YMap()
    sharedComponent.set('state', component.state)
    sharedComponent.set('name', component.name)
    const sharedSlots = new YArray()
    sharedComponent.set('slots', sharedSlots)
    component.__slots__.toArray().forEach(slot => {
      const sharedSlot = this.createSharedSlotBySlot(slot)
      sharedSlots.push([sharedSlot])
    })
    this.syncComponentSlots(sharedSlots, component)
    this.syncComponentState(sharedComponent, component)
    return sharedComponent
  }

  protected createSharedSlotBySlot(slot: Slot): YMap<any> {
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
    slot.getAttributes().forEach(item => {
      sharedContent.setAttribute(item[0].name, item[1])
    })
    this.syncSlotContent(sharedContent, slot)
    this.syncSlotState(sharedSlot, slot)
    return sharedSlot
  }

  protected createComponentBySharedComponent(yMap: YMap<any>): Component {
    const sharedSlots = yMap.get('slots') as YArray<YMap<any>>
    const slots: Slot[] = []
    sharedSlots.forEach(sharedSlot => {
      const slot = this.createSlotBySharedSlot(sharedSlot)
      slots.push(slot)
    })
    const name = yMap.get('name')
    const state = yMap.get('state')
    const instance = this.registry.createComponentByData(name, {
      state,
      slots
    })
    if (instance) {
      instance.__slots__.toArray().forEach((slot, index) => {
        let sharedSlot = sharedSlots.get(index)
        if (!sharedSlot) {
          sharedSlot = this.createSharedSlotBySlot(slot)
          sharedSlots.push([sharedSlot])
        }
        this.syncSlotState(sharedSlot, slot)
        this.syncSlotContent(sharedSlot.get('content'), slot)
      })
      return instance
    }

    throw collaborateErrorFn(`cannot find component factory \`${name}\`.`)
  }

  protected createSlotBySharedSlot(sharedSlot: YMap<any>): Slot {
    const content = sharedSlot.get('content') as YText
    const delta = content.toDelta()

    const slot = this.registry.createSlot({
      schema: sharedSlot.get('schema'),
      state: sharedSlot.get('state'),
      attributes: {},
      formats: {},
      content: []
    })

    const attrs = content.getAttributes()
    Object.keys(attrs).forEach(key => {
      const attribute = this.registry.getAttribute(key)
      if (attribute) {
        slot.setAttribute(attribute, attrs[key])
      }
    })
    for (const action of delta) {
      if (action.insert) {
        if (typeof action.insert === 'string') {
          const formats = remoteFormatsToLocal(this.registry, action.attributes)
          slot.insert(action.insert, formats)
        } else {
          const sharedComponent = action.insert as YMap<any>
          const component = this.createComponentBySharedComponent(sharedComponent)
          slot.insert(component, remoteFormatsToLocal(this.registry, action.attributes))
          this.syncComponentSlots(sharedComponent.get('slots'), component)
          this.syncComponentState(sharedComponent, component)
        }
      } else {
        throw collaborateErrorFn('unexpected delta action.')
      }
    }
    return slot
  }

  protected cleanSubscriptionsBySlot(slot: Slot) {
    this.contentMap.delete(slot);
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

  protected cleanSubscriptionsByComponent(component: Component) {
    [this.slotsSyncCaches.get(component), this.componentStateSyncCaches.get(component)].forEach(fn => {
      if (fn) {
        fn()
      }
    })
    component.__slots__.toArray().forEach(slot => {
      this.cleanSubscriptionsBySlot(slot)
    })
  }
}

function remoteFormatsToLocal(registry: Registry, attrs?: any,) {
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
