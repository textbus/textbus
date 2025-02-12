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
  AsyncSlot,
  AsyncComponent,
  AbstractSelection,
  observe,
  ProxyModel
} from '@textbus/core'
import {
  AbstractType,
  Array as YArray, createAbsolutePositionFromRelativePosition, createRelativePositionFromTypeIndex,
  Doc as YDoc,
  Map as YMap,
  RelativePosition,
  Text as YText,
  Transaction,
  UndoManager,
  YArrayEvent,
  YMapEvent,
  YTextEvent
} from 'yjs'

import { SubModelLoader } from './sub-model-loader'

export interface RelativePositionRecord {
  doc: YDoc,
  position: RelativePosition
}

export interface CursorPosition {
  anchor: RelativePositionRecord
  focus: RelativePositionRecord
}

export interface CollaborateHistorySelectionPosition {
  before: CursorPosition | null
  after: CursorPosition | null
}

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

export interface SubModelLoaded {
  yType: AbstractType<any>
  yDoc: YDoc
}

@Injectable()
export class Collaborate {
  yDoc = new YDoc()
  slotMap = new SlotMap()
  onAddSubModel: Observable<SubModelLoaded>

  private subscriptions: Subscription[] = []
  private updateFromRemote = false
  private addSubModelEvent = new Subject<SubModelLoaded>()

  private updateRemoteActions = new WeakMap<YDoc, UpdateItem[]>()
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
      yDoc.transact(() => {
        this.initSharedSlotByLocalSlot(sharedSlot, localSlot)
      })
    }
    this.initSyncEvent(yDoc)
    this.syncSlot(sharedSlot, localSlot)
  }

  getAbstractSelection(position: CursorPosition): AbstractSelection | null {
    const anchorPosition = createAbsolutePositionFromRelativePosition(position.anchor.position, position.anchor.doc)
    const focusPosition = createAbsolutePositionFromRelativePosition(position.focus.position, position.focus.doc)
    if (anchorPosition && focusPosition) {
      const focusSlot = this.slotMap.get(focusPosition.type as YText)
      const anchorSlot = this.slotMap.get(anchorPosition.type as YText)
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

  getRelativeCursorLocation(): CursorPosition | null {
    const { anchorSlot, anchorOffset, focusSlot, focusOffset } = this.selection
    if (anchorSlot) {
      const anchorYText = this.slotMap.get(anchorSlot)
      if (anchorYText) {
        const anchorPosition = createRelativePositionFromTypeIndex(anchorYText, anchorOffset!)
        if (focusSlot) {
          const focusYText = this.slotMap.get(focusSlot)
          if (focusYText) {
            const focusPosition = createRelativePositionFromTypeIndex(focusYText, focusOffset!)
            return {
              focus: {
                doc: focusYText.doc!,
                position: focusPosition
              },
              anchor: {
                doc: anchorYText.doc!,
                position: anchorPosition
              }
            }
          }
        }
      }
    }
    return null
  }

  restoreCursorPosition(position: CursorPosition | null) {
    if (!position) {
      this.selection.unSelect()
      return
    }
    const selection = this.getAbstractSelection(position)
    if (selection) {
      this.selection.setBaseAndExtent(
        selection.anchorSlot,
        selection.anchorOffset,
        selection.focusSlot,
        selection.focusOffset)
    }
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

        const updateRemoteActions = this.updateRemoteActions.get(yDoc) || []

        for (const item of updateRemoteActions) {
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

        this.updateRemoteActions.delete(yDoc)

        for (const item of updates) {
          yDoc.transact(() => {
            item.actions.forEach(fn => {
              fn()
            })
          }, item.record ? yDoc : this.noRecord)
        }
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
      this.runLocalUpdate(sharedSlot.doc, true, () => {
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
      })
    })

    this.slotMap.set(localSlot, sharedSlot)

    localSlot.__changeMarker__.addDetachCallback(() => {
      this.slotMap.delete(localSlot)
      sharedSlot.unobserve(syncRemote)
      sub.unsubscribe()
    })
  }


  destroy() {
    this.subscriptions.forEach(i => i.unsubscribe())
    this.subscriptions = []
  }

  private syncSharedMapToLocalMap(sharedMap: YMap<any>, localMap: ProxyModel<Record<string, any>>) {
    sharedMap.forEach((value, key) => {
      localMap[key] = this.createLocalModelBySharedByModel(value)
    })
    this.syncObject(sharedMap, localMap)
  }

  private createLocalMapBySharedMap(sharedMap: YMap<any>): ProxyModel<Record<string, any>> {
    const localMap = observe({}) as ProxyModel<Record<string, any>>
    this.syncSharedMapToLocalMap(sharedMap, localMap)
    return localMap
  }

  private createLocalArrayBySharedArray(sharedArray: YArray<any>): ProxyModel<any[]> {
    const localArray = observe<any[]>([]) as ProxyModel<any[]>
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
      const sharedMetadata = this.createSharedMapByLocalMap(localSlot.metadata)
      sharedSlot.setAttribute('metadata', sharedMetadata)
      this.subModelLoader.createSubModelBySlot(localSlot).then(subDocument => {
        if (isDestroyed) {
          return
        }
        const content = subDocument.getText('content')
        this.initSharedSlotByLocalSlot(content, localSlot)
        this.syncSlot(content, localSlot)
        this.addSubModelEvent.next({
          yDoc: subDocument,
          yType: content
        })
        this.initSyncEvent(subDocument)
        localSlot.loader.markAsLoaded()
      })
      localSlot.__changeMarker__.addDetachCallback(() => {
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

    if (type === 'async') {
      const metadata = sharedSlot.getAttribute('metadata') as YMap<any>
      const slot = new AsyncSlot(schema || [], {})
      this.syncSharedMapToLocalMap(metadata, slot.metadata as ProxyModel<Record<string, any>>)
      const loadedSubDocument = this.subModelLoader.getLoadedModelBySlot(slot)
      if (loadedSubDocument) {
        const subContent = loadedSubDocument.getText('content')
        this.syncRootSlot(loadedSubDocument, subContent, slot)
        this.addSubModelEvent.next({
          yDoc: loadedSubDocument,
          yType: subContent
        })
        slot.loader.markAsLoaded()
        return slot
      }
      let isDestroyed = false
      slot.loader.onRequestLoad.toPromise().then(() => {
        return this.subModelLoader.loadSubModelBySlot(slot)
      }).then(subDocument => {
        if (isDestroyed) {
          return
        }
        slot.loader.markAsLoaded()
        const subContent = subDocument.getText('content')
        this.syncRootSlot(subDocument, subContent, slot)
        this.addSubModelEvent.next({
          yDoc: subDocument,
          yType: subContent
        })
      })
      slot.__changeMarker__.addDetachCallback(() => {
        isDestroyed = true
      })
      return slot
    }

    const contentDelta = sharedSlot.toDelta()
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
      const sharedMetadata = this.createSharedMapByLocalMap(component.metadata)
      sharedComponent.set('metadata', sharedMetadata)
      const state = component.state as ProxyModel<Record<string, any>>
      let isDestroyed = false
      state.__changeMarker__.addDetachCallback(() => {
        isDestroyed = true
      })
      this.subModelLoader.createSubModelByComponent(component).then(subDocument => {
        if (isDestroyed) {
          return
        }
        const state = subDocument.getMap('state')
        this.syncComponent(subDocument, state, component)
        this.addSubModelEvent.next({
          yType: state,
          yDoc: subDocument
        })
        this.initSyncEvent(subDocument)
        component.loader.markAsLoaded()
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
      instance = this.registry.createComponentByData(componentName, {}, {})
      if (instance instanceof AsyncComponent) {
        const sharedMetadata = yMap.get('metadata') as YMap<any>
        this.syncSharedMapToLocalMap(sharedMetadata, instance.metadata)
        const loadedSubDocument = this.subModelLoader.getLoadedModelByComponent(instance)
        if (loadedSubDocument) {
          const state = loadedSubDocument.getMap('state')
          this.syncComponent(loadedSubDocument, state, instance!)
          this.addSubModelEvent.next({
            yType: state,
            yDoc: loadedSubDocument
          })
          instance.loader.markAsLoaded()
          return instance
        }

        const state = instance.state as ProxyModel<Record<string, any>>
        let isDestroyed = false
        instance.loader.onRequestLoad.toPromise().then(() => {
          return this.subModelLoader.loadSubModelByComponent(instance as AsyncComponent)
        })
          .then(subDocument => {
            if (isDestroyed) {
              return
            }
            (instance as AsyncComponent).loader.markAsLoaded()
            const state = subDocument.getMap('state')
            this.syncComponent(subDocument, state, instance!)
            this.addSubModelEvent.next({
              yType: state,
              yDoc: subDocument
            })
          })
        state.__changeMarker__.addDetachCallback(() => {
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
    function logError(type: string) {
      console.error(collaborateErrorFn(`${type} error, length exceeded, path in ${localArray.__changeMarker__.getPaths().join('/')}`))
    }

    const sub = localArray.__changeMarker__.onSelfChange.subscribe((actions) => {
      this.runLocalUpdate(sharedArray.doc, !localArray.__changeMarker__.irrevocableUpdate, () => {
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
              if (index <= sharedArray.length) {
                sharedArray.insert(index, data)
              } else {
                sharedArray.insert(sharedArray.length, data)
                logError('insert')
              }
            }
              break
            case 'delete':
              if (action.count <= 0) {
                break
              }
              if (index < sharedArray.length) {
                sharedArray.delete(index, action.count)
              } else {
                logError('delete')
              }
              break
            case 'setIndex':
              if (action.index < sharedArray.length) {
                sharedArray.delete(action.index, 1)
                sharedArray.insert(action.index, [this.createSharedModelByLocalModel(action.ref)])
              } else {
                sharedArray.insert(sharedArray.length, [this.createSharedModelByLocalModel(action.ref)])
                logError('setIndex')
              }
              break
          }
        }
      })
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
    localArray.__changeMarker__.addDetachCallback(() => {
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
      this.runLocalUpdate(sharedObject.doc, !localObject.__changeMarker__.irrevocableUpdate, () => {
        for (const action of actions) {
          switch (action.type) {
            case 'propSet': {
              const subModel = this.createSharedModelByLocalModel(action.ref)
              sharedObject.set(action.key, subModel)
              if (sharedObject.size === 0) {
                // 奇怪的 bug，设置了子模型，但子模型会标记为 deleted，导致设置后无效
                console.error(collaborateErrorFn(`prop set error, key is ${action.key}`))
              }
            }
              break
            case 'propDelete':
              sharedObject.delete(action.key)
              break
          }
        }
      })
    })

    localObject.__changeMarker__.addDetachCallback(function () {
      sharedObject.unobserve(syncRemote)
      sub.unsubscribe()
    })
  }

  private runLocalUpdate(yDoc: YDoc | null, record: boolean, fn: () => void) {
    if (this.updateFromRemote || !yDoc) {
      return
    }
    let changeList = this.updateRemoteActions.get(yDoc)
    if (!changeList) {
      changeList = []
      this.updateRemoteActions.set(yDoc, changeList)
    }
    changeList.push({
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
