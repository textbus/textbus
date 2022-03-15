import {
  Doc as YDoc,
  Map as YMap,
  YArrayEvent,
  YEvent,
  YMapEvent,
  Text as YText,
  YTextEvent,
  Array as YArray,
} from 'yjs'
import { ComponentInstance, ComponentLiteral, makeError, Registry, Selection, Slot, Translator } from '@textbus/core'

type YPath = [number, string][]
const collaborateErrorFn = makeError('Collaborate')

export class RemoteToLocal {
  constructor(private yDoc: YDoc,
              private translator: Translator,
              private selection: Selection,
              private registry: Registry) {
  }

  transform(events: YEvent[], rootComponent: ComponentInstance) {
    events.forEach(ev => {
      const path: YPath = []

      for (let i = 0; i < ev.path.length; i += 2) {
        path.push(ev.path.slice(i, i + 2) as [number, string])
      }

      const slot = rootComponent.slots.get(0)

      if (!slot) {
        throw collaborateErrorFn('cannot find child slot in root component!')
      }

      if (path.length) {
        const componentIndex = path.shift()![0] as number
        const component = slot.getContentAtIndex(componentIndex) as ComponentInstance
        this.applySharedComponentToComponent(ev, path, component)
        return
      }

      this.applySharedSlotToSlot(ev, path, slot)
    })
  }

  private applySharedComponentToComponent(ev: YEvent, path: YPath, component: ComponentInstance) {
    if (path.length) {
      const childPath = path.shift()!
      const slot = component.slots.get(childPath[0])!
      this.applySharedSlotToSlot(ev, path, slot)
      return
    }
    if (ev instanceof YMapEvent) {
      ev.keysChanged.forEach(key => {
        if (key === 'state') {
          const state = (ev.target as YMap<any>).get('state')
          component.updateState(draft => {
            Object.assign(draft, state)
          })
        }
      })
    } else if (ev instanceof YArrayEvent) {
      const slots = component.slots
      ev.delta.forEach(action => {
        if (Reflect.has(action, 'retain')) {
          slots.retain(action.retain!)
        } else if (action.insert) {
          (action.insert as Array<YMap<any>>).forEach(item => {
            slots.insert(this.createSlotBySharedSlot(item))
          })
        } else if (action.delete) {
          slots.retain(slots.index)
          slots.delete(action.delete)
        }
      })
    }
  }

  private applySharedSlotToSlot(ev: YEvent, path: YPath, slot: Slot) {
    if (path.length) {
      path.shift()
      const delta = (ev.target.parent as YText).toDelta()
      let componentIndex = 0
      for (let i = 0; i < delta.length; i++) {
        const action = delta[i]
        if (action.insert === ev.target) {
          break
        }
        componentIndex += typeof action.insert === 'string' ? action.insert.length : 1
      }
      const component = slot.getContentAtIndex(componentIndex) as ComponentInstance
      this.applySharedComponentToComponent(ev, path, component)
      return
    }
    if (ev instanceof YTextEvent) {
      slot.retain(0)
      let offset = 0
      ev.delta.forEach(action => {
        if (Reflect.has(action, 'retain')) {
          if (action.attributes) {
            slot.retain(action.retain!, Object.keys(action.attributes).map(key => {
              return [this.registry.getFormatter(key)!, action.attributes![key]]
            }))
          }
          slot.retain(action.retain!)
        } else if (action.insert) {
          if (typeof action.insert === 'string') {
            slot.insert(action.insert, action.attributes ? Object.keys(action.attributes).map(key => {
              return [this.registry.getFormatter(key)!, action.attributes![key]]
            }) : [])
            offset += action.insert.length
          } else {
            const component = this.createComponentBySharedComponent(action.insert as YMap<any>)
            slot.insert(component)
            offset += 1
          }
        } else if (action.delete) {
          slot.retain(slot.index)
          slot.delete(action.delete)
          offset -= action.delete
        } else if (action.attributes) {
          slot.updateState(draft => {
            Object.assign(draft, action.attributes)
          })
        }
      })
      if (this.selection.isSelected) {
        if (slot === this.selection.startSlot) {
          this.selection.setStart(slot, this.selection.startOffset! + offset)
        }
        if (slot === this.selection.endSlot) {
          this.selection.setEnd(slot, this.selection.endOffset! + offset)
        }
      }
    } else if (ev instanceof YMapEvent) {
      ev.keysChanged.forEach(key => {
        if (key === 'state') {
          const state = (ev.target as YMap<any>).get('state')
          slot.updateState(draft => {
            Object.assign(draft, state)
          })
        }
      })
    }
  }

  private createComponentBySharedComponent(yMap: YMap<any>): ComponentInstance {
    const slots = yMap.get('slots') as YArray<YMap<any>>
    const componentLiteral: ComponentLiteral = {
      state: yMap.get('state'),
      name: yMap.get('name'),
      slots: slots.map(sharedSlot => {
        return this.createSlotBySharedSlot(sharedSlot).toJSON()
      })
    }
    return this.translator.createComponent(componentLiteral)!
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
          slot.insert(this.createComponentBySharedComponent(action.insert))
        }
      } else {
        throw collaborateErrorFn('Unexpected delta action.')
      }
    }
    return slot
  }
}
