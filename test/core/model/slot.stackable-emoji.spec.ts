/**
 * UTF-16 下标边界上的可堆叠格式（与 emoji 长度对齐策略一致）。
 */
import { ContentType, Slot, Textbus } from '@textbus/core'
import { NodeModule, NodeViewAdapter } from '@textbus/platform-node'

import { stackCommentFormatter } from '../../_editor/formatters/stackable-test.formatters'

let textbus: Textbus

beforeAll(() => {
  textbus = new Textbus({
    imports: [new NodeModule(new NodeViewAdapter({}, () => {}))]
  })
})

afterAll(() => {
  textbus.destroy()
})

describe('可堆叠格式 — emoji 边界', () => {
  test('在 emoji 序列上分段打 stack 后 range 与字符索引一致', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('❤️❤️')
    expect(slot.length).toBe(4)
    slot.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 2, value: 'e1' })
    slot.applyFormat(stackCommentFormatter, { startIndex: 2, endIndex: 4, value: 'e2' })
    const ranges = slot.getFormatRangesByFormatter(stackCommentFormatter, 0, slot.length)
    expect(ranges.length).toBe(2)
    const sorted = [...ranges].sort((a, b) => a.startIndex - b.startIndex)
    expect(sorted[0]).toMatchObject({ startIndex: 0, endIndex: 2, value: 'e1' })
    expect(sorted[1]).toMatchObject({ startIndex: 2, endIndex: 4, value: 'e2' })
  })
})
