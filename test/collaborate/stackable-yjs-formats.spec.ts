import { createVNode, PendingErasure, Registry, Slot, ContentType, StackableFormatter } from '@textbus/core'

import {
  formatsArrayToRemoteRecord,
  localFormatsRecordToRemote,
  localFormatsToYjsAttributes,
  remoteInsertFormatsToLocal,
  remoteRetainFormatsToLocal,
} from '../../packages/collaborate/src/base/collaborate'
import { stackCommentFormatter } from '../_editor/formatters/stackable-test.formatters'
import { boldFormatter } from '../_editor/formatters/bold.formatter'

function createRegistry(): Registry {
  return {
    getFormatter(name: string) {
      if (name === stackCommentFormatter.name) {
        return stackCommentFormatter
      }
      if (name === boldFormatter.name) {
        return boldFormatter
      }
      return null
    },
  } as Registry
}

function slotWithStackComments(values: string[], rangeLen = 3) {
  const slot = new Slot([ContentType.Text])
  slot.insert('abcde')
  slot.retain(0)
  values.forEach(v => {
    slot.retain(rangeLen, stackCommentFormatter, v)
    slot.retain(0)
  })
  return slot
}

describe('stackable Yjs formats', () => {
  const registry = createRegistry()

  test('localFormatsRecordToRemote 仅可堆叠格式包成数组', () => {
    const remote = localFormatsRecordToRemote(registry, {
      'stack-comment': 'n1',
      bold: true,
    })
    expect(remote).toEqual({ 'stack-comment': ['n1'], bold: true })
  })

  test('remoteInsertFormatsToLocal 展开可堆叠数组', () => {
    const formats = remoteInsertFormatsToLocal(registry, {
      'stack-comment': ['n1', 'n2'],
      bold: true,
    })
    expect(formats).toEqual([
      [stackCommentFormatter, 'n1'],
      [stackCommentFormatter, 'n2'],
      [boldFormatter, true],
    ])
  })

  test('remoteInsertFormatsToLocal 兼容旧版单值', () => {
    const formats = remoteInsertFormatsToLocal(registry, { 'stack-comment': 'legacy' })
    expect(formats).toEqual([[stackCommentFormatter, 'legacy']])
  })

  test('remoteInsertFormatsToLocal 空值不产生格式', () => {
    expect(remoteInsertFormatsToLocal(registry, { 'stack-comment': null })).toEqual([])
    expect(remoteInsertFormatsToLocal(registry, { 'stack-comment': [] })).toEqual([])
  })

  test('remoteRetainFormatsToLocal 远程删除单条时生成 PendingErasure(false)', () => {
    const slot = slotWithStackComments(['n1', 'n2'])
    const formats = remoteRetainFormatsToLocal(registry, slot, 0, 3, { 'stack-comment': ['n2'] })
    expect(formats).toEqual([[stackCommentFormatter, new PendingErasure(false, 'n1')]])
  })

  test('remoteRetainFormatsToLocal 远程 null 或空数组时全清', () => {
    const slot = slotWithStackComments(['n1'])
    expect(remoteRetainFormatsToLocal(registry, slot, 0, 3, { 'stack-comment': null })).toEqual([
      [stackCommentFormatter, new PendingErasure(true)],
    ])
    expect(remoteRetainFormatsToLocal(registry, slot, 0, 3, { 'stack-comment': [] })).toEqual([
      [stackCommentFormatter, new PendingErasure(true)],
    ])
  })

  test('remoteRetainFormatsToLocal 远程与本地一致时不产生操作', () => {
    const slot = slotWithStackComments(['n1', 'n2'])
    const formats = remoteRetainFormatsToLocal(registry, slot, 0, 3, { 'stack-comment': ['n1', 'n2'] })
    expect(formats).toEqual([])
  })

  test('remoteRetainFormatsToLocal 远程新增取值时追加', () => {
    const slot = slotWithStackComments(['n1'])
    const formats = remoteRetainFormatsToLocal(registry, slot, 0, 3, { 'stack-comment': ['n1', 'n2'] })
    expect(formats).toEqual([[stackCommentFormatter, 'n2']])
  })

  test('formatsArrayToRemoteRecord 未注册格式不传远端', () => {
    const unknownFormatter = new StackableFormatter('unknown-fmt', {
      render(children) {
        return createVNode('span', {}, children)
      },
    })
    const remote = formatsArrayToRemoteRecord(registry, [
      [unknownFormatter, 'x'],
      [boldFormatter, true],
    ])
    expect(remote).toEqual({ bold: true })
  })

  test('formatsArrayToRemoteRecord 合并同名字段为数组', () => {
    const remote = formatsArrayToRemoteRecord(registry, [
      [stackCommentFormatter, 'n1'],
      [stackCommentFormatter, 'n2'],
      [boldFormatter, true],
    ])
    expect(remote).toEqual({ 'stack-comment': ['n1', 'n2'], bold: true })
  })

  test('localFormatsToYjsAttributes 从 Slot 读取区间内全部可堆叠取值', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abcde')
    slot.retain(0)
    slot.retain(3, stackCommentFormatter, 'n1')
    slot.retain(0)
    slot.retain(3, stackCommentFormatter, 'n2')

    const attrs = localFormatsToYjsAttributes(registry, slot, 0, 3, { 'stack-comment': 'n2' })
    expect(attrs['stack-comment']).toEqual(['n1', 'n2'])
    expect(attrs.bold).toBeUndefined()
  })

  test('localFormatsToYjsAttributes 擦除后写空为 null', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abc')
    slot.retain(0, stackCommentFormatter, 'n1')
    slot.retain(0, stackCommentFormatter, new PendingErasure(true))

    const attrs = localFormatsToYjsAttributes(registry, slot, 0, 3, { 'stack-comment': new PendingErasure(true) })
    expect(attrs['stack-comment']).toBeNull()
  })

  test('远程快照差量 retain 后本地与远程一致', () => {
    const slot = slotWithStackComments(['n1', 'n2'])
    const formats = remoteRetainFormatsToLocal(registry, slot, 0, 3, { 'stack-comment': ['n2'] })
    slot.retain(0)
    slot.retain(3, formats)
    const ranges = slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 3)
    expect(ranges.map(r => r.value)).toEqual(['n2'])
  })
})
