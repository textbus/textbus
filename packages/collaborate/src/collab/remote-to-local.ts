import { Map as YMap, YArrayEvent, YEvent, YMapEvent } from 'yjs'
import { ComponentInstance, FormatType, Registry, Slot, Translator } from '@textbus/core'

type YPath = [number, string][]

export function remoteToLocal(events: YEvent[], slot: Slot, translator: Translator, registry: Registry) {
  events.forEach(ev => {
    const path: YPath = []

    for (let i = 0; i < ev.path.length; i += 2) {
      path.push(ev.path.slice(i, i + 2) as [number, string])
    }

    if (path.length) {
      const componentIndex = path.shift()![0] as number
      const component = slot.getContentAtIndex(componentIndex) as ComponentInstance
      applySharedComponentToComponent(ev, path, component, translator, registry)
      return
    }

    apply(ev, slot, translator)
  })
}

function applySharedComponentToComponent(ev: YEvent, path: YPath, component: ComponentInstance, translator: Translator, registry: Registry,) {
  if (path.length) {
    const childPath = path.shift()!
    const slot = component.slots.get(childPath[0])!
    applySharedSlotToSlot(ev, path, slot, translator, registry, childPath[1] === 'formats')
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
        (action.insert as Array<any>).forEach(item => {
          slots.insert(translator.createSlot(item.toJSON())!)
        })
      } else if (action.delete) {
        slots.retain(slots.index)
        slots.delete(action.delete)
      }
    })
  }
}

function applySharedSlotToSlot(ev: YEvent, path: YPath, slot: Slot, translator: Translator, registry: Registry, isUpdateFormats: boolean) {
  if (path.length) {
    const componentIndex = path.shift()![0]
    const component = slot.getContentAtIndex(componentIndex) as ComponentInstance
    applySharedComponentToComponent(ev, path, component, translator, registry)
    return
  }

  if (ev instanceof YArrayEvent) {
    ev.delta.forEach(action => {
      if (Reflect.has(action, 'retain')) {
        slot.retain(action.retain!)
      } else if (action.insert) {
        (action.insert as Array<any>).forEach(item => {
          if (typeof item === 'string') {
            slot.insert(item)
          } else {
            slot.insert(translator.createComponent(item.toJSON())!)
          }
        })
      } else if (action.delete) {
        slot.retain(slot.index)
        slot.delete(action.delete)
      }
    })
  } else if (ev instanceof YMapEvent) {
    if (isUpdateFormats) {
      const json = ev.target.toJSON()
      ev.keysChanged.forEach(key => {
        const formats = json[key]
        const formatter = registry.getFormatter(key)!
        if (formatter.type !== FormatType.Block) {
          slot.applyFormat(formatter, {
            startIndex: 0,
            endIndex: slot.length,
            value: null
          })
        }
        formats.forEach(item => {
          if (formatter.type === FormatType.Block) {
            slot.applyFormat(formatter, item.value)
          } else {
            slot.applyFormat(formatter, item)
          }
        })
      })
    } else {
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
}

function apply(ev: YEvent, slot: Slot, translator: Translator) {
  if (ev instanceof YArrayEvent) {
    slot.retain(0)
    const delta = ev.delta
    delta.forEach(action => {
      if (action.insert) {
        (action.insert as Array<string | YMap<any>>).forEach(item => {
          if (typeof item === 'string') {
            slot.insert(item)
          } else {
            const json = item.toJSON()
            const component = translator.createComponent(json)!
            slot.insert(component)
          }
        })
      } else if (action.retain) {
        slot.retain(action.retain)
      } else if (action.delete) {
        slot.retain(slot.index)
        slot.delete(action.delete)
      }
    })
  }
}
