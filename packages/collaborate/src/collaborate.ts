import { Injectable } from '@viewfly/core'
import { filter, map, Observable, Subject, Subscription } from '@tanbo/stream'
import {
  ChangeOrigin,
  Component,
  Registry,
  Formats,
  makeError,
  Scheduler,
  Selection,
  Slot,
  ProxyModel,
  createObjectProxy,
  createArrayProxy,
} from '@textbus/core'
import {
  AbstractType,
  Array as YArray,
  Doc as YDoc,
  Map as YMap,
  Text as YText,
  Transaction,
  UndoManager,
  YArrayEvent,
  YMapEvent,
  YTextEvent
} from 'yjs'

import { AsyncComponent, AsyncSlot, SubModelLoader } from './sub-model-loader'

const collaborateErrorFn = makeError('Collaborate')

class SlotMap {
  private slotAndYTextMap = new WeakMap<Slot, YText>()
  private yTextAndSlotMap = new WeakMap<YText, Slot>()

  set(key: Slot, value: YText): void
  set(key: YText, value: Slot): void
  set(key: any, value: any) {
    if (key instanceof Slot) {
      this.slotAndYTextMap.set(key, value)
      this.yTextAndSlotMap.set(value, key)
    } else {
      this.slotAndYTextMap.set(value, key)
      this.yTextAndSlotMap.set(key, value)
    }
  }

  get(key: Slot): YText | null
  get(key: YText): Slot | null
  get(key: any) {
    if (key instanceof Slot) {
      return this.slotAndYTextMap.get(key) || null
    }
    return this.yTextAndSlotMap.get(key) || null
  }

  delete(key: Slot | YText) {
    if (key instanceof Slot) {
      const v = this.slotAndYTextMap.get(key)
      this.slotAndYTextMap.delete(key)
      if (v) {
        this.yTextAndSlotMap.delete(v)
      }
    } else {
      const v = this.yTextAndSlotMap.get(key)
      this.yTextAndSlotMap.delete(key)
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

@Injectable()
export class Collaborate {
  yDoc = new YDoc()
  slotMap = new SlotMap()
  onAddSubModel: Observable<AbstractType<any>>

  private subscriptions: Subscription[] = []
  private updateFromRemote = false
  private addSubModelEvent = new Subject<AbstractType<any>>()

  private updateRemoteActions: Array<UpdateItem> = []
  private noRecord = {}

  constructor(private scheduler: Scheduler,
              private registry: Registry,
              private selection: Selection,
              private subModelLoader: SubModelLoader) {
    this.onAddSubModel = this.addSubModelEvent.asObservable()
  }

  syncRootComponent(yDoc: YDoc, sharedComponent: YMap<any>, localComponent: Component<any>) {
    this.initSyncEvent(yDoc)
    this.syncComponent(yDoc, sharedComponent, localComponent)
  }

  syncRootSlot(yDoc: YDoc, sharedSlot: YText, localSlot: Slot) {
    if (sharedSlot.length) {
      localSlot.retain(0)
      localSlot.delete(localSlot.length)
      localSlot.cleanAttributes()
      localSlot.cleanFormats()
      this.initLocalSlotBySharedSlot(sharedSlot, localSlot)
    } else {
      this.initSharedSlotByLocalSlot(sharedSlot, localSlot)
    }
    this.initSyncEvent(yDoc)
    this.syncSlot(sharedSlot, localSlot)
  }

  private initSyncEvent(yDoc: YDoc) {
    this.subscriptions.push(
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
          yDoc.transact(() => {
            item.actions.forEach(fn => {
              fn()
            })
          }, item.record ? yDoc : this.noRecord)
        }
        // this.localChangesAppliedEvent.next()
      })
    )
  }

  private syncComponent(yDoc: YDoc, sharedComponent: YMap<any>, localComponent: Component<any>) {
    let state = sharedComponent.get('state') as YMap<any>
    if (!state) {
      state = new YMap<any>()
      this.syncLocalMapToSharedMap(localComponent.state as ProxyModel<Record<string, any>>, state)
      yDoc.transact(() => {
        sharedComponent.set('state', state)
      })
    } else {
      Object.keys(localComponent.state).forEach(key => {
        Reflect.deleteProperty(localComponent.state, key)
      })
      this.syncSharedMapToLocalMap(state, localComponent.state as ProxyModel<Record<string, any>>)
    }
  }

  private syncSlot(sharedSlot: YText, localSlot: Slot) {
    const syncRemote = (ev: YTextEvent, tr: Transaction) => {
      this.runRemoteUpdate(tr, () => {
        localSlot.retain(0)
        ev.keysChanged.forEach(key => {
          const change = ev.keys.get(key)
          if (!change) {
            return
          }
          const updateType = change.action
          if (updateType === 'update' || updateType === 'add') {
            const attribute = this.registry.getAttribute(key)
            if (attribute) {
              localSlot.setAttribute(attribute, sharedSlot.getAttribute(key))
            }
          } else if (updateType === 'delete') {
            const attribute = this.registry.getAttribute(key)
            if (attribute) {
              localSlot.removeAttribute(attribute)
            }
          }
        })
        ev.delta.forEach(action => {
          if (Reflect.has(action, 'retain')) {
            if (action.attributes) {
              const formats = remoteFormatsToLocal(this.registry, action.attributes)
              if (formats.length) {
                localSlot.retain(action.retain!, formats)
              }
              localSlot.retain(localSlot.index + action.retain!)
            } else {
              localSlot.retain(action.retain!)
            }
          } else if (action.insert) {
            const index = localSlot.index
            let length = 1
            if (typeof action.insert === 'string') {
              length = action.insert.length
              localSlot.insert(action.insert, remoteFormatsToLocal(this.registry, action.attributes))
            } else {
              const sharedComponent = action.insert as YMap<any>
              const component = this.createLocalComponentBySharedComponent(sharedComponent)
              localSlot.insert(component)
            }
            if (this.selection.isSelected && !(tr.origin instanceof UndoManager)) {
              if (localSlot === this.selection.anchorSlot && this.selection.anchorOffset! > index) {
                this.selection.setAnchor(localSlot, this.selection.anchorOffset! + length)
              }
              if (localSlot === this.selection.focusSlot && this.selection.focusOffset! > index) {
                this.selection.setFocus(localSlot, this.selection.focusOffset! + length)
              }
            }
          } else if (action.delete) {
            const index = localSlot.index
            localSlot.delete(action.delete)
            if (this.selection.isSelected && !(tr.origin instanceof UndoManager)) {
              if (localSlot === this.selection.anchorSlot && this.selection.anchorOffset! >= index) {
                this.selection.setAnchor(localSlot, this.selection.startOffset! - action.delete)
              }
              if (localSlot === this.selection.focusSlot && this.selection.focusOffset! >= index) {
                this.selection.setFocus(localSlot, this.selection.focusOffset! - action.delete)
              }
            }
          }
        })
      })
    }
    sharedSlot.observe(syncRemote)

    const sub = localSlot.onContentChange.subscribe(actions => {
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
                sharedSlot.format(offset, action.offset, formats)
              }
            } else {
              offset = action.offset
            }
          } else if (action.type === 'contentInsert') {
            const delta = sharedSlot.toDelta()
            const isEmpty = delta.length === 1 && delta[0].insert === Slot.emptyPlaceholder
            if (typeof action.content === 'string') {
              length = action.content.length
              sharedSlot.insert(offset, action.content, action.formats || {})
            } else {
              length = 1
              const sharedComponent = this.createSharedComponentByLocalComponent(action.ref as Component)
              sharedSlot.insertEmbed(offset, sharedComponent, action.formats || {})
            }

            if (isEmpty && offset === 0) {
              sharedSlot.delete(sharedSlot.length - 1, 1)
            }
            offset += length
          } else if (action.type === 'delete') {
            const delta = sharedSlot.toDelta()
            if (sharedSlot.length) {
              sharedSlot.delete(offset, action.count)
            }
            if (sharedSlot.length === 0) {
              sharedSlot.insert(0, '\n', delta[0]?.attributes)
            }
          } else if (action.type === 'attrSet') {
            sharedSlot.setAttribute(action.name, action.value)
          } else if (action.type === 'attrDelete') {
            sharedSlot.removeAttribute(action.name)
          }
        }
      }, true)
    })

    this.slotMap.set(localSlot, sharedSlot)

    localSlot.__changeMarker__.destroyCallbacks.push(() => {
      this.slotMap.delete(localSlot)
      sharedSlot.unobserve(syncRemote)
      sub.unsubscribe()
    })
  }


  destroy() {
    this.subscriptions.forEach(i => i.unsubscribe())
  }

  private syncSharedMapToLocalMap(sharedMap: YMap<any>, localMap: ProxyModel<Record<string, any>>) {
    sharedMap.forEach((value, key) => {
      localMap[key] = this.createLocalModelBySharedByModel(value)
    })
    this.syncObject(sharedMap, localMap)
  }

  private createLocalMapBySharedMap(sharedMap: YMap<any>): ProxyModel<Record<string, any>> {
    const localMap = createObjectProxy({}) as ProxyModel<Record<string, any>>
    this.syncSharedMapToLocalMap(sharedMap, localMap)
    return localMap
  }

  private createLocalArrayBySharedArray(sharedArray: YArray<any>): ProxyModel<any[]> {
    const localArray = createArrayProxy<any[]>([]) as ProxyModel<any[]>
    localArray.push(...sharedArray.map(item => this.createLocalModelBySharedByModel(item)))
    this.syncArray(sharedArray, localArray)
    return localArray
  }

  private syncLocalMapToSharedMap(localMap: ProxyModel<Record<string, any>>, sharedMap: YMap<any>) {
    Object.entries(localMap).forEach(([key, value]) => {
      sharedMap.set(key, this.createSharedModelByLocalModel(value))
    })
    this.syncObject(sharedMap, localMap)
  }

  private createSharedMapByLocalMap(localMap: ProxyModel<Record<string, any>>): YMap<any> {
    const sharedMap = new YMap<any>()
    this.syncLocalMapToSharedMap(localMap, sharedMap)
    return sharedMap
  }

  private createSharedArrayByLocalArray(localArray: ProxyModel<any[]>): YArray<any> {
    const sharedArray = new YArray<any>()
    localArray.forEach(value => {
      sharedArray.push([this.createSharedModelByLocalModel(value)])
    })
    this.syncArray(sharedArray, localArray)
    return sharedArray
  }

  private createSharedSlotByLocalSlot(localSlot: Slot): YText {
    const sharedSlot = new YText()
    const isAsyncSlot = localSlot instanceof AsyncSlot
    sharedSlot.setAttribute('schema', [...localSlot.schema])
    sharedSlot.setAttribute('type', isAsyncSlot ? 'async' : 'sync')

    if (isAsyncSlot) {
      let isDestroyed = false
      this.subModelLoader.createSubModelBySlot(localSlot).then(subDocument => {
        if (isDestroyed) {
          return
        }
        const content = subDocument.getText('content')
        this.initSharedSlotByLocalSlot(content, localSlot)
        this.syncSlot(content, localSlot)
        this.addSubModelEvent.next(content)
      })
      localSlot.__changeMarker__.destroyCallbacks.push(() => {
        isDestroyed = true
      })
      return sharedSlot
    }

    const sharedContent = new YText()
    this.initSharedSlotByLocalSlot(sharedContent, localSlot)
    sharedSlot.insertEmbed(0, sharedContent)
    this.syncSlot(sharedContent, localSlot)
    return sharedSlot
  }

  private initSharedSlotByLocalSlot(sharedContent: YText, localSlot: Slot) {
    let offset = 0
    localSlot.toDelta().forEach(i => {
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
        const sharedComponent = this.createSharedComponentByLocalComponent(i.insert)
        sharedContent.insertEmbed(offset, sharedComponent, formats)
      }
      offset += i.insert.length
    })
    localSlot.getAttributes().forEach(item => {
      sharedContent.setAttribute(item[0].name, item[1])
    })
  }

  private createLocalSlotBySharedSlot(sharedSlot: YText): Slot {
    const type = sharedSlot.getAttribute('type')
    const schema = sharedSlot.getAttribute('schema')
    const contentDelta = sharedSlot.toDelta()

    if (type === 'async') {
      const metadata = sharedSlot.getAttribute('metadata')
      const slot = new AsyncSlot(schema || [], metadata)
      let isDestroyed = false
      slot.loader.onRequest.toPromise().then(() => {
        return this.subModelLoader.loadSubModelBySlot(slot)
      }).then(subDocument => {
        if (isDestroyed) {
          return
        }
        const subContent = subDocument.getText('content')
        this.initLocalSlotBySharedSlot(subContent, slot)
        this.syncSlot(subContent, slot)
        this.addSubModelEvent.next(subContent)
      })
      slot.__changeMarker__.destroyCallbacks.push(() => {
        isDestroyed = true
      })
      return slot
    }

    const content = contentDelta[0]?.insert

    if (!(content instanceof YText)) {
      throw collaborateErrorFn('shared slot content type is not `YText`.')
    }

    const localSlot = new Slot(schema || [])

    this.initLocalSlotBySharedSlot(content, localSlot)

    this.syncSlot(content, localSlot)
    return localSlot
  }

  private initLocalSlotBySharedSlot(content: YText, localSlot: Slot) {
    const delta = content.toDelta()

    const attrs = content.getAttributes()
    Object.keys(attrs).forEach(key => {
      const attribute = this.registry.getAttribute(key)
      if (attribute) {
        localSlot.setAttribute(attribute, attrs[key])
      }
    })
    for (const action of delta) {
      if (action.insert) {
        if (typeof action.insert === 'string') {
          const formats = remoteFormatsToLocal(this.registry, action.attributes)
          localSlot.insert(action.insert, formats)
        } else {
          const sharedComponent = action.insert as YMap<any>
          const component = this.createLocalComponentBySharedComponent(sharedComponent)
          localSlot.insert(component, remoteFormatsToLocal(this.registry, action.attributes))
        }
      } else {
        throw collaborateErrorFn('unexpected delta action.')
      }
    }
  }

  private createSharedModelByLocalModel(localModel: any) {
    if (localModel instanceof Slot) {
      return this.createSharedSlotByLocalSlot(localModel)
    }
    if (Array.isArray(localModel)) {
      return this.createSharedArrayByLocalArray(localModel as ProxyModel<any[]>)
    }
    if (typeof localModel === 'object' && localModel !== null) {
      return this.createSharedMapByLocalMap(localModel)
    }
    return localModel
  }

  private createLocalModelBySharedByModel(sharedModel: any) {
    if (sharedModel instanceof YMap) {
      return this.createLocalMapBySharedMap(sharedModel)
    }
    if (sharedModel instanceof YArray) {
      return this.createLocalArrayBySharedArray(sharedModel)
    }
    if (sharedModel instanceof YText) {
      return this.createLocalSlotBySharedSlot(sharedModel)
    }
    return sharedModel
  }


  private createSharedComponentByLocalComponent(component: Component | AsyncComponent): YMap<any> {
    const sharedComponent = new YMap()
    sharedComponent.set('name', component.name)

    if (component instanceof AsyncComponent) {
      sharedComponent.set('type', 'async')
      sharedComponent.set('metadata', component.getMetadata())
      const state = component.state as ProxyModel<Record<string, any>>
      let isDestroyed = false
      state.__changeMarker__.destroyCallbacks.push(() => {
        isDestroyed = true
      })
      this.subModelLoader.createSubModelByComponent(component).then(subDocument => {
        if (isDestroyed) {
          return
        }
        const state = subDocument.getMap('state')
        this.syncComponent(subDocument, state, component)
        this.addSubModelEvent.next(state)
      })
      return sharedComponent
    }

    const sharedState = this.createSharedMapByLocalMap(component.state as ProxyModel<Record<string, any>>)
    sharedComponent.set('state', sharedState)
    sharedComponent.set('type', 'sync')
    return sharedComponent
  }

  private createLocalComponentBySharedComponent(yMap: YMap<any>): Component {
    const componentName = yMap.get('name') as string
    const type = yMap.get('type') as string

    let instance: Component<any> | null
    if (type === 'async') {
      instance = this.registry.createComponentByData(componentName, {})
      if (instance instanceof AsyncComponent) {
        instance.setMetadata(yMap.get('metadata'))
        const state = instance.state as ProxyModel<Record<string, any>>
        let isDestroyed = false
        instance.loader.onRequest.toPromise().then(() => {
          return this.subModelLoader.loadSubModelByComponent(instance as AsyncComponent)
        })
          .then(subDocument => {
            if (isDestroyed) {
              return
            }
            const state = subDocument.getMap('state')
            this.syncComponent(subDocument, state, instance!)
            this.addSubModelEvent.next(state)
          })
        state.__changeMarker__.destroyCallbacks.push(() => {
          isDestroyed = true
        })
      } else if (instance instanceof Component) {
        throw collaborateErrorFn(`component name \`${componentName}\` is not a async component.`)
      }
    } else {
      const sharedState = yMap.get('state') as YMap<any>
      const state = this.createLocalMapBySharedMap(sharedState)
      instance = this.registry.createComponentByData(componentName, state)
    }
    if (instance) {
      return instance
    }

    throw collaborateErrorFn(`cannot find component factory \`${componentName}\`.`)
  }

  /**
   * 双向同步数组
   * @param sharedArray
   * @param localArray
   * @private
   */
  private syncArray(sharedArray: YArray<any>, localArray: ProxyModel<any[]>) {
    const sub = localArray.__changeMarker__.onSelfChange.subscribe((actions) => {
      this.runLocalUpdate(() => {
        let index = 0
        for (const action of actions) {
          switch (action.type) {
            case 'retain':
              index = action.offset
              break
            case 'insert': {
              const ref = action.ref
              if (!Array.isArray(ref)) {
                throw collaborateErrorFn('The insertion action must have a reference value.')
              }
              const data = ref.map(item => {
                return this.createSharedModelByLocalModel(item)
              })
              sharedArray.insert(index, data)
            }
              break
            case 'delete':
              if (action.count <= 0) {
                break
              }
              sharedArray.delete(index, action.count)
              break
            case 'setIndex':
              sharedArray.delete(action.index, 1)
              sharedArray.insert(action.index, [this.createSharedModelByLocalModel(action.ref)])
              break
          }
        }
      }, !localArray.__changeMarker__.irrevocableUpdate)
    })

    const syncRemote = (ev: YArrayEvent<any>, tr: Transaction) => {
      this.runRemoteUpdate(tr, () => {
        let index = 0
        ev.delta.forEach((action) => {
          if (Reflect.has(action, 'retain')) {
            index += action.retain as number
          } else if (action.insert) {
            const data = (action.insert as Array<any>).map((item) => {
              return this.createLocalModelBySharedByModel(item)
            })
            localArray.splice(index, 0, ...data)
            index += data.length
          } else if (action.delete) {
            localArray.splice(index, action.delete)
          }
        })
      })
    }

    sharedArray.observe(syncRemote)
    localArray.__changeMarker__.destroyCallbacks.push(() => {
      sub.unsubscribe()
      sharedArray.unobserve(syncRemote)
    })
  }

  /**
   * 双向同步对象
   * @param sharedObject
   * @param localObject
   * @private
   */
  private syncObject(sharedObject: YMap<any>, localObject: ProxyModel<Record<string, any>>) {
    const syncRemote = (ev: YMapEvent<any>, tr: Transaction) => {
      this.runRemoteUpdate(tr, () => {
        ev.changes.keys.forEach((item, key) => {
          if (item.action === 'add' || item.action === 'update') {
            const value = sharedObject.get(key)
            localObject[key] = this.createLocalModelBySharedByModel(value)
          } else {
            Reflect.deleteProperty(localObject, key)
          }
        })
      })
    }

    sharedObject.observe(syncRemote)

    const sub = localObject.__changeMarker__.onSelfChange.subscribe((actions) => {
      this.runLocalUpdate(() => {
        for (const action of actions) {
          switch (action.type) {
            case 'propSet':
              sharedObject.set(action.key, this.createSharedModelByLocalModel(action.ref))
              break
            case 'propDelete':
              sharedObject.delete(action.key)
              break
          }
        }
      }, !localObject.__changeMarker__.irrevocableUpdate)
    })

    localObject.__changeMarker__.destroyCallbacks.push(function () {
      sharedObject.unobserve(syncRemote)
      sub.unsubscribe()
    })
  }

  private runLocalUpdate(fn: () => void, record: boolean) {
    if (this.updateFromRemote) {
      return
    }
    this.updateRemoteActions.push({
      record,
      action: fn
    })
  }

  private runRemoteUpdate(tr: Transaction, fn: () => void) {
    if (tr.origin === tr.doc) {
      return
    }
    this.updateFromRemote = true
    if (tr.origin instanceof UndoManager) {
      this.scheduler.historyApplyTransact(fn)
    } else {
      this.scheduler.remoteUpdateTransact(fn)
    }
    this.updateFromRemote = false
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
