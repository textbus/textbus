import { Action, Operation, SlotLiteral, ComponentLiteral, makeError } from '@textbus/core'
import { Array as YArray, Map as YMap, Text as YText } from 'yjs'

const collaborateErrorFn = makeError('Collaborate')

export class LocalToRemote {
  transform(operation: Operation, root: YText) {
    const path = [...operation.path]
    path.shift()
    if (path.length) {
      const componentIndex = path.shift()!
      const sharedComponent = this.getSharedComponentByIndex(root, componentIndex)
      if (sharedComponent) {
        this.applyComponentOperationToSharedComponent(path, operation.apply, sharedComponent)
      }
      return
    }
    this.mergeActionsToSharedSlot(root, operation.apply)
  }

  private applyComponentOperationToSharedComponent(path: number[], actions: Action[], componentYMap: YMap<any>) {
    const sharedSlots = componentYMap.get('slots') as YArray<any>
    if (path.length) {
      const slotIndex = path.shift()!
      const sharedSlot = sharedSlots.get(slotIndex)
      this.applySlotOperationToSharedSlot(path, actions, sharedSlot)
      return
    }
    let index: number
    actions.forEach(action => {
      switch (action.type) {
        case 'retain':
          index = action.offset
          break
        case 'insertSlot':
          sharedSlots.insert(index, [this.makeSharedSlotBySlotLiteral(action.slot)])
          index++
          break
        case 'apply':
          componentYMap.set('state', action.value)
          break
        case 'delete':
          sharedSlots.delete(index, action.count)
          break
      }
    })
  }

  private applySlotOperationToSharedSlot(path: number[], actions: Action[], slotYMap: YMap<any>) {
    if (path.length) {
      const componentIndex = path.shift()!
      const sharedContent = slotYMap.get('content') as YText
      const sharedComponent = this.getSharedComponentByIndex(sharedContent, componentIndex)!
      this.applyComponentOperationToSharedComponent(path, actions, sharedComponent)
      return
    }
    const content = slotYMap.get('content') as YText

    this.mergeActionsToSharedSlot(content, actions, slotYMap)
  }

  private mergeActionsToSharedSlot(content: YText, actions: Action[], slotYMap?: YMap<any>) {
    let index: number
    let length: number

    actions.forEach(action => {
      if (action.type === 'retain') {
        if (action.formats) {
          content.format(index, action.offset, action.formats)
        } else {
          index = action.offset
        }
      } else if (action.type === 'insert') {
        const delta = content.toDelta()
        const isEmpty = delta.length === 1 && delta[0].insert === '\n'

        if (typeof action.content === 'string') {
          length = action.content.length
          content.insert(index, action.content)
        } else {
          length = 1
          content.insertEmbed(index, this.makeSharedComponentByComponentLiteral(action.content))
        }
        if (action.formats) {
          content.format(index, length, action.formats)
        }
        if (isEmpty && index === 0) {
          content.delete(content.length - 1, 1)
        }
        index += length
      } else if (action.type === 'delete') {
        const delta = content.toDelta()
        content.delete(index, action.count)
        if (content.length === 0) {
          content.insert(0, '\n', delta[0]?.attributes)
        }
      } else if (action.type === 'apply') {
        slotYMap?.set('state', action.value)
      }
    })
  }

  private makeSharedSlotBySlotLiteral(slotLiteral: SlotLiteral): YMap<any> {
    const content = new YText()
    let index = 0
    slotLiteral.content.forEach(i => {
      let size: number
      if (typeof i === 'string') {
        size = i.length
        content.insert(index, i)
      } else {
        size = 1
        content.insertEmbed(index, this.makeSharedComponentByComponentLiteral(i))
      }
      index += size
    })
    const formats = slotLiteral.formats
    Object.keys(formats).forEach(key => {
      const formatRanges = formats[key]
      formatRanges.forEach(formatRange => {
        content.format(formatRange.startIndex, formatRange.endIndex - formatRange.startIndex, {
          [key]: formatRange.value
        })
      })
    })

    const sharedSlot = new YMap()
    sharedSlot.set('content', content)
    sharedSlot.set('schema', slotLiteral.schema)
    sharedSlot.set('state', slotLiteral.state)
    return sharedSlot
  }

  private makeSharedComponentByComponentLiteral(componentLiteral: ComponentLiteral): YMap<any> {
    const slots = new YArray()
    componentLiteral.slots.forEach(item => {
      slots.push([this.makeSharedSlotBySlotLiteral(item)])
    })
    const sharedComponent = new YMap()
    sharedComponent.set('name', componentLiteral.name)
    sharedComponent.set('slots', slots)
    sharedComponent.set('state', componentLiteral.state)
    return sharedComponent
  }

  private getSharedComponentByIndex(host: YText, index: number): YMap<any> | null {
    const delta = host.toDelta()
    let i = 0
    for (const action of delta) {
      if (action.insert) {
        if (i === index) {
          return action.insert instanceof YMap ? action.insert : null
        }
        i += action.insert instanceof YMap ? 1 : action.insert.length
      } else {
        throw collaborateErrorFn('Unexpected delta action.')
      }
    }
    return null
  }
}
