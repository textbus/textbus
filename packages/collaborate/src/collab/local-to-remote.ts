import { Action, Operation, SlotLiteral, ComponentLiteral, Format, FormatRange, FormatValue } from '@textbus/core'
import { Array as YArray, Map as YMap } from 'yjs'

export function localToRemote(operation: Operation, root: YArray<any>) {
  const path = [...operation.path]
  path.shift()
  if (path.length) {
    const componentIndex = path.shift()!
    applyComponentOperationToSharedComponent(path, operation.apply, root.get(componentIndex))
    return
  }
  insertContent(root, operation.apply)
}

function applyComponentOperationToSharedComponent(path: number[], actions: Action[], componentYMap: YMap<any>) {
  const sharedSlots = componentYMap.get('slots') as YArray<any>
  if (path.length) {
    const slotIndex = path.shift()!
    const sharedSlot = sharedSlots.get(slotIndex)
    applySlotOperationToSharedSlot(path, actions, sharedSlot)
    return
  }
  let index: number
  actions.forEach(action => {
    switch (action.type) {
      case 'retain':
        index = action.index
        break
      case 'insertSlot':
        sharedSlots.insert(index, [makeSharedSlotBySlotLiteral(action.slot)])
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

function applySlotOperationToSharedSlot(path: number[], actions: Action[], slotYMap: YMap<any>) {
  if (path.length) {
    const componentIndex = path.shift()!
    const sharedContent = slotYMap.get('content') as YArray<any>
    const sharedComponent = sharedContent.get(componentIndex)
    applyComponentOperationToSharedComponent(path, actions, sharedComponent)
    return
  }
  const content = slotYMap.get('content') as YArray<any>

  let index: number
  let len: number
  actions.forEach(action => {
    switch (action.type) {
      case 'retain':
        if (action.formats) {
          mergeSharedFormats(index, action.index, action.formats, slotYMap)
        }
        index = action.index
        break
      case 'insert':
        if (typeof action.content === 'string') {
          len = action.content.length
          content.insert(index, action.content.split(''))
        } else {
          len = 1
          content.insert(index, [makeSharedComponentByComponentLiteral(action.content)])
        }
        if (action.formats) {
          insertSharedFormats(index, len, action.formats, slotYMap)
        }
        break
      case 'delete':
        if (content.length === 0) {
          // 当内容为空时，slot 实例内容为 ['\n']，触发删除会导致长度溢出
          return
        }
        content.delete(index, action.count)
        break
      case 'apply':
        slotYMap.set('state', action.value)
        break
    }
  })
}

function insertSharedFormats(index: number, distance: number, formats: Record<string, FormatValue>, sharedSlots: YMap<any>) {
  const sharedFormats = sharedSlots.get('formats') as YMap<FormatRange[]>
  const keys = Array.from(sharedFormats.keys())
  const expandedValues = Array.from<string>({length: distance})
  keys.forEach(key => {
    const formatRanges = sharedFormats.get(key)!
    const values = Format.tileRanges(formatRanges)
    values.splice(index, 0, ...expandedValues)
    const newRanges = Format.toRanges(values)
    sharedFormats.set(key, newRanges)
  })
  mergeSharedFormats(index, index + distance, formats, sharedSlots)
}

function mergeSharedFormats(startIndex: number, endIndex: number, formats: Record<string, FormatValue>, sharedSlots: YMap<any>) {
  const sharedFormats = sharedSlots.get('formats') as YMap<FormatRange[]>
  Object.keys(formats).forEach(key => {
    if (!sharedFormats.has(key)) {
      sharedFormats.set(key, [{
        startIndex,
        endIndex,
        value: formats[key]
      }])
    }

    const oldFormatRanges = sharedFormats.get(key)!
    const formatRanges = Format.normalizeFormatRange(oldFormatRanges, {
      startIndex,
      endIndex,
      value: formats[key]
    })
    sharedFormats.set(key, formatRanges)
  })
}

function insertContent(content: YArray<any>, actions: Action[]) {
  let index: number
  actions.forEach(action => {
    switch (action.type) {
      case 'retain':
        index = action.index
        break
      case 'insert':
        content.insert(index!, [
          typeof action.content === 'string' ?
            action.content :
            makeSharedComponentByComponentLiteral(action.content)
        ])
        if (action.formats) {
          // TODO 根节点样式
        }
        break
      case 'delete':
        content.delete(index, action.count)
        break
    }
  })
}

function makeSharedSlotBySlotLiteral(slotLiteral: SlotLiteral): YMap<any> {
  const content = new YArray()
  let index = 0
  slotLiteral.content.forEach(i => {
    let size: number
    if (typeof i === 'string') {
      size = i.length
      content.insert(index, [i])
    } else {
      size = 1
      content.insert(index, [makeSharedComponentByComponentLiteral(i)])
    }
    index += size
  })
  const formats = new YMap()
  Object.keys(slotLiteral.formats).forEach(key => {
    formats.set(key, slotLiteral.formats[key])
  })

  const sharedSlot = new YMap()
  sharedSlot.set('state', slotLiteral.state)
  sharedSlot.set('content', content)
  sharedSlot.set('schema', slotLiteral.schema)
  sharedSlot.set('formats', formats)
  return sharedSlot
}

function makeSharedComponentByComponentLiteral(componentLiteral: ComponentLiteral): YMap<any> {
  const slots = new YArray()
  componentLiteral.slots.forEach(item => {
    slots.push([makeSharedSlotBySlotLiteral(item)])
  })
  const sharedComponent = new YMap()
  sharedComponent.set('name', componentLiteral.name)
  sharedComponent.set('slots', slots)
  sharedComponent.set('state', componentLiteral.state)
  return sharedComponent
}
