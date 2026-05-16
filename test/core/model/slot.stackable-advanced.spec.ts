/**
 * 可堆叠格式：Slot 层进阶场景（擦除形态、相邻合并、对象取值、内容联动、混排、toTree、JSON、extract、background）。
 * 若与当前实现不一致，用例失败可驱动实现修正。
 */
import {
  ContentType,
  createVNode,
  PendingErasure,
  Slot,
  Textbus,
  VElement,
  VTextNode
} from '@textbus/core'
import { NodeModule, NodeViewAdapter } from '@textbus/platform-node'

import { boldFormatter } from '../../_editor/formatters/bold.formatter'
import { fontSizeFormatter } from '../../_editor/formatters/font-size.formatter'
import {
  stackColumnedFormatter,
  stackCommentFormatter,
  stackGuardedFormatter,
  stackNoteObjectFormatter
} from '../../_editor/formatters/stackable-test.formatters'

let textbus: Textbus

beforeAll(() => {
  textbus = new Textbus({
    imports: [
      new NodeModule(new NodeViewAdapter({}, () => {
        //
      }))
    ]
  })
})

afterAll(() => {
  textbus.destroy()
})

describe('可堆叠格式 — Slot 进阶', () => {
  test('PendingErasure(false) 只作用于与擦除区间重叠的堆叠段，未重叠段保留', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('0123456789')
    slot.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 10, value: 'full' })
    slot.retain(3)
    slot.retain(4, stackCommentFormatter, new PendingErasure(false, 'full'))
    const ranges = slot.getFormatRangesByFormatter(stackCommentFormatter, 0, slot.length)
    const sorted = [...ranges].sort((a, b) => a.startIndex - b.startIndex)
    expect(sorted.length).toBe(2)
    expect(sorted[0]).toMatchObject({ startIndex: 0, endIndex: 3, value: 'full' })
    expect(sorted[1]).toMatchObject({ startIndex: 7, endIndex: 10, value: 'full' })
  })

  test('相邻两段同值且无重叠下标时应合并为一段（[0,2) 与 [2,4)）', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abcd')
    slot.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 2, value: 'edge' })
    slot.applyFormat(stackCommentFormatter, { startIndex: 2, endIndex: 4, value: 'edge' })
    const ranges = slot.getFormatRangesByFormatter(stackCommentFormatter, 0, slot.length)
    expect(ranges.length).toBe(1)
    expect(ranges[0]).toMatchObject({ startIndex: 0, endIndex: 4, value: 'edge' })
  })

  test('对象取值：结构相等应合并区间；结构不等应并存', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abcdef')
    slot.applyFormat(stackNoteObjectFormatter, { startIndex: 0, endIndex: 2, value: { id: 1 } })
    slot.applyFormat(stackNoteObjectFormatter, { startIndex: 1, endIndex: 3, value: { id: 1 } })
    const merged = slot.getFormatRangesByFormatter(stackNoteObjectFormatter, 0, slot.length)
    expect(merged.length).toBe(1)
    expect(merged[0]).toMatchObject({ startIndex: 0, endIndex: 3, value: { id: 1 } })

    slot.insert('ghijkl')
    slot.applyFormat(stackNoteObjectFormatter, { startIndex: 6, endIndex: 8, value: { id: 1 } })
    slot.applyFormat(stackNoteObjectFormatter, { startIndex: 7, endIndex: 9, value: { id: 2 } })
    const tail = slot.getFormatRangesByFormatter(stackNoteObjectFormatter, 6, 12)
    expect(tail.length).toBe(2)
  })

  test('删除中间字符后堆叠区间下标与正文一致', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abcdef')
    slot.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 2, value: 'L' })
    slot.applyFormat(stackCommentFormatter, { startIndex: 4, endIndex: 6, value: 'R' })
    slot.retain(2)
    slot.delete(2)
    const ranges = slot.getFormatRangesByFormatter(stackCommentFormatter, 0, slot.length)
    const sorted = [...ranges].sort((a, b) => a.startIndex - b.startIndex)
    expect(sorted[0]).toMatchObject({ startIndex: 0, endIndex: 2, value: 'L' })
    expect(sorted[1]).toMatchObject({ startIndex: 2, endIndex: 4, value: 'R' })
    expect(slot.sliceContent().join('')).toBe('abef')
  })

  test('insert(content, Formats) 可写入可堆叠格式', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('xx')
    slot.retain(1)
    slot.insert('y', [[stackCommentFormatter, 'ins']])
    const ranges = slot.getFormatRangesByFormatter(stackCommentFormatter, 0, slot.length)
    expect(ranges.some(r => r.value === 'ins' && r.startIndex <= 1 && r.endIndex >= 2)).toBe(true)
  })

  test('write(content, formatter, value) 可写入可堆叠格式', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert(Slot.emptyPlaceholder)
    slot.retain(1)
    slot.write('z', stackCommentFormatter, 'w')
    const ranges = slot.getFormatRangesByFormatter(stackCommentFormatter, 0, slot.length)
    expect(ranges.some(r => r.value === 'w')).toBe(true)
  })

  test('同段上可堆叠 + 普通格式并存，清除堆叠不影响普通格式', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('hello')
    slot.applyFormat(boldFormatter, { startIndex: 0, endIndex: 5, value: true })
    slot.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 5, value: 'c1' })
    slot.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 5, value: 'c2' })
    slot.retain(0)
    slot.retain(5, stackCommentFormatter, null)
    expect(slot.getFormatRangesByFormatter(stackCommentFormatter, 0, slot.length).length).toBe(0)
    const boldRanges = slot.getFormatRangesByFormatter(boldFormatter, 0, slot.length)
    expect(boldRanges.length).toBeGreaterThan(0)
  })

  test('stackable + columned 的 Formatter 可生成 toTree 不抛错', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abcde')
    slot.applyFormat(stackColumnedFormatter, { startIndex: 1, endIndex: 4, value: true })
    slot.applyFormat(stackColumnedFormatter, { startIndex: 2, endIndex: 3, value: false })
    const tree = slot.toTree(children => createVNode('div', null, children))
    expect(tree).toBeTruthy()
  })

  test('checkHost 返回 false 时不应写入该格式', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('ab')
    slot.applyFormat(stackGuardedFormatter, { startIndex: 0, endIndex: 2, value: 'deny-me' })
    expect(slot.getFormatRangesByFormatter(stackGuardedFormatter, 0, slot.length).length).toBe(0)
    slot.applyFormat(stackGuardedFormatter, { startIndex: 0, endIndex: 2, value: 'ok' })
    expect(slot.getFormatRangesByFormatter(stackGuardedFormatter, 0, slot.length).length).toBeGreaterThan(0)
  })

  test('toJSON 中可堆叠多段应保留多条 range 结构', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abc')
    slot.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 1, value: 'a' })
    slot.applyFormat(stackCommentFormatter, { startIndex: 1, endIndex: 2, value: 'b' })
    const json = slot.toJSON()
    const arr = json.formats['stack-comment'] as Array<{ startIndex: number; endIndex: number; value: string }>
    expect(Array.isArray(arr)).toBe(true)
    expect(arr.length).toBeGreaterThanOrEqual(2)
  })

  test('extractFormatsByIndex：同一下标落在多条堆叠上时应能列出多条', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abc')
    slot.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 3, value: 'x' })
    slot.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 3, value: 'y' })
    const at1 = slot.extractFormatsByIndex(1)
    const commentEntries = at1.filter(([f]) => f === stackCommentFormatter)
    expect(commentEntries.length).toBe(2)
  })

  test('background 内对子区间 retain 的可堆叠格式应写入', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('12345')
    slot.background(() => {
      slot.retain(1)
      slot.retain(3, stackCommentFormatter, 'bg')
    })
    const ranges = slot.getFormatRangesByFormatter(stackCommentFormatter, 0, slot.length)
    expect(ranges.some(r => r.value === 'bg' && r.startIndex === 1 && r.endIndex === 4)).toBe(true)
  })

  test('本段无旧区间时对 PendingErasure(true) 应为稳定空操作', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('xyz')
    slot.retain(0)
    slot.retain(3, stackCommentFormatter, new PendingErasure(true))
    expect(slot.getFormatRangesByFormatter(stackCommentFormatter, 0, slot.length).length).toBe(0)
  })
})

function stackRangesByValue(slot: Slot, value: string) {
  return slot
    .getFormatRangesByFormatter(stackCommentFormatter, 0, slot.length)
    .filter(r => r.value === value)
}

describe('可堆叠格式 — mergeRanges / mergeAdjacentSameValue（Slot 间接）', () => {
  test('同取值碎片经合并后应首尾相接成一段（中间夹其它取值不阻断）', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abcde')
    slot.applyFormat(stackCommentFormatter, { startIndex: 1, endIndex: 2, value: 's1' })
    slot.applyFormat(stackCommentFormatter, { startIndex: 1, endIndex: 2, value: 's2' })
    slot.applyFormat(stackCommentFormatter, { startIndex: 3, endIndex: 5, value: 's1' })
    slot.applyFormat(stackCommentFormatter, { startIndex: 3, endIndex: 5, value: 's2' })
    slot.applyFormat(stackCommentFormatter, { startIndex: 2, endIndex: 3, value: 's1' })

    const s1 = stackRangesByValue(slot, 's1')
    expect(s1.length).toBe(1)
    expect(s1[0]).toMatchObject({ startIndex: 1, endIndex: 5, value: 's1' })

    const s2 = stackRangesByValue(slot, 's2')
    expect(s2.length).toBe(2)
    expect(s2.map(r => [r.startIndex, r.endIndex]).sort()).toEqual([
      [1, 2],
      [3, 5],
    ])
  })

  test('同取值中间有空隙时不应合并', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abcde')
    slot.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 2, value: 'gap' })
    slot.applyFormat(stackCommentFormatter, { startIndex: 3, endIndex: 5, value: 'gap' })

    const gap = stackRangesByValue(slot, 'gap')
    expect(gap.length).toBe(2)
    expect(gap[0]).toMatchObject({ startIndex: 0, endIndex: 2, value: 'gap' })
    expect(gap[1]).toMatchObject({ startIndex: 3, endIndex: 5, value: 'gap' })
  })

  test('同区间同取值重复 apply 应合并为一段', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abcd')
    slot.applyFormat(stackCommentFormatter, { startIndex: 1, endIndex: 3, value: 'dup' })
    slot.applyFormat(stackCommentFormatter, { startIndex: 1, endIndex: 3, value: 'dup' })

    const dup = stackRangesByValue(slot, 'dup')
    expect(dup.length).toBe(1)
    expect(dup[0]).toMatchObject({ startIndex: 1, endIndex: 3, value: 'dup' })
  })

  test('applyErasure：整段擦除、部分裁剪、非目标取值与擦除窗相交仍整段保留', () => {
    const slotFull = new Slot([ContentType.Text])
    slotFull.insert('abcde')
    slotFull.applyFormat(stackCommentFormatter, { startIndex: 2, endIndex: 4, value: 'gone' })
    slotFull.retain(0)
    slotFull.retain(5, stackCommentFormatter, null)
    expect(slotFull.getFormatRangesByFormatter(stackCommentFormatter, 0, slotFull.length).length).toBe(0)

    const slotClip = new Slot([ContentType.Text])
    slotClip.insert('0123456789')
    slotClip.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 10, value: 'clip' })
    slotClip.retain(3)
    slotClip.retain(4, stackCommentFormatter, new PendingErasure(false, 'clip'))
    const clipped = stackRangesByValue(slotClip, 'clip')
    expect(clipped.length).toBe(2)
    expect(clipped[0]).toMatchObject({ startIndex: 0, endIndex: 3, value: 'clip' })
    expect(clipped[1]).toMatchObject({ startIndex: 7, endIndex: 10, value: 'clip' })

    const slotKeep = new Slot([ContentType.Text])
    slotKeep.insert('abcde')
    slotKeep.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 5, value: 's1' })
    slotKeep.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 5, value: 's2' })
    slotKeep.retain(2)
    slotKeep.retain(1, stackCommentFormatter, new PendingErasure(false, 's1'))
    expect(stackRangesByValue(slotKeep, 's2')).toEqual([
      { startIndex: 0, endIndex: 5, value: 's2' },
    ])
    const s1After = stackRangesByValue(slotKeep, 's1')
    expect(s1After.length).toBe(2)
    expect(s1After[0]).toMatchObject({ startIndex: 0, endIndex: 2, value: 's1' })
    expect(s1After[1]).toMatchObject({ startIndex: 3, endIndex: 5, value: 's1' })
  })

  test('尚无区间时 retain(null) 不应写入格式', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abc')
    slot.retain(0)
    slot.retain(3, stackCommentFormatter, null)
    expect(slot.getFormatRangesByFormatter(stackCommentFormatter, 0, slot.length).length).toBe(0)
  })

  test('background 内 retain 写入的格式应与已有区间按 background 合并顺序共存', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abcde')
    slot.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 2, value: 'outer' })
    slot.background(() => {
      slot.retain(0)
      slot.retain(5, stackCommentFormatter, 'inner')
    })
    const outer = stackRangesByValue(slot, 'outer')
    const inner = stackRangesByValue(slot, 'inner')
    expect(outer.length).toBeGreaterThan(0)
    expect(inner.some(r => r.startIndex === 0 && r.endIndex === 5 && r.value === 'inner')).toBe(true)
    expect(outer.some(r => r.value === 'outer' && r.startIndex < 2)).toBe(true)
  })

  test('删文后区间应裁剪到插槽长度且去掉空段', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abcdef')
    slot.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 6, value: 'v' })
    slot.retain(3)
    slot.delete(4)
    expect(slot.length).toBe(3)
    const ranges = slot.getFormatRangesByFormatter(stackCommentFormatter, 0, slot.length)
    expect(ranges.length).toBeGreaterThan(0)
    ranges.forEach(r => {
      expect(r.startIndex).toBeGreaterThanOrEqual(0)
      expect(r.endIndex).toBeLessThanOrEqual(slot.length)
      expect(r.startIndex).toBeLessThan(r.endIndex)
    })
    expect(ranges.every(r => r.endIndex <= 3)).toBe(true)
  })

  test('同取值原本不相邻：删除中间正文后相接应合并为一段', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abcdef')
    slot.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 2, value: 'join' })
    slot.applyFormat(stackCommentFormatter, { startIndex: 4, endIndex: 6, value: 'join' })
    expect(stackRangesByValue(slot, 'join').length).toBe(2)

    slot.retain(2)
    slot.delete(2)
    expect(slot.sliceContent().join('')).toBe('abef')

    const join = stackRangesByValue(slot, 'join')
    expect(join.length).toBe(1)
    expect(join[0]).toMatchObject({ startIndex: 0, endIndex: 4, value: 'join' })
  })

  test('同格式中间插入无格式正文应拆成两段区间', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abcde')
    slot.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 5, value: 'span' })
    expect(stackRangesByValue(slot, 'span').length).toBe(1)

    slot.retain(2)
    slot.insert('XY')
    expect(slot.sliceContent().join('')).toBe('abXYcde')

    const span = stackRangesByValue(slot, 'span')
    expect(span.length).toBe(2)
    expect(span[0]).toMatchObject({ startIndex: 0, endIndex: 2, value: 'span' })
    expect(span[1]).toMatchObject({ startIndex: 4, endIndex: 7, value: 'span' })
  })

  test('非堆叠格式：retain 覆盖多段旧区间时外侧保留、重叠区改为新值', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('0123456')
    slot.applyFormat(fontSizeFormatter, { startIndex: 0, endIndex: 2, value: '10px' })
    slot.applyFormat(fontSizeFormatter, { startIndex: 5, endIndex: 7, value: '10px' })
    slot.retain(1)
    slot.retain(4, fontSizeFormatter, '20px')

    const ranges = slot.getFormatRangesByFormatter(fontSizeFormatter, 0, slot.length)
    const sorted = [...ranges].sort((a, b) => a.startIndex - b.startIndex)
    expect(sorted).toEqual([
      { startIndex: 0, endIndex: 1, value: '10px' },
      { startIndex: 1, endIndex: 5, value: '20px' },
      { startIndex: 5, endIndex: 7, value: '10px' },
    ])
  })

  test('对象取值 PendingErasure(false) 与区间值非 deepEqual 时不擦除', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abc')
    slot.applyFormat(stackNoteObjectFormatter, { startIndex: 0, endIndex: 3, value: { id: 1 } })
    slot.applyFormat(stackNoteObjectFormatter, { startIndex: 0, endIndex: 3, value: { id: 2 } })
    slot.retain(0)
    slot.retain(3, stackNoteObjectFormatter, new PendingErasure(false, { id: 1, tag: 'x' }))
    const ranges = slot.getFormatRangesByFormatter(stackNoteObjectFormatter, 0, slot.length)
    expect(ranges.length).toBe(2)
    expect(ranges.map(r => r.value.id).sort()).toEqual([1, 2])
  })
})
