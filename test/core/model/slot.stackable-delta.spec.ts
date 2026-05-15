/**
 * DeltaLite.insertDelta / toDelta 与可堆叠格式。
 */
import { ContentType, DeltaLite, Slot, Textbus } from '@textbus/core'
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

describe('可堆叠格式 — Delta', () => {
  test('insertDelta 可一次插入带多条 stackable 的 formats', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('x')
    const delta = new DeltaLite()
    delta.push({
      insert: 'yz',
      formats: [
        [stackCommentFormatter, 'd1'],
        [stackCommentFormatter, 'd2']
      ]
    })
    slot.retain(1)
    const rest = slot.insertDelta(delta)
    expect(rest.length).toBe(0)
    const ranges = slot.getFormatRangesByFormatter(stackCommentFormatter, 0, slot.length)
    expect(ranges.length).toBe(2)
  })

  test('toDelta 再 insertDelta 到新插槽可复现堆叠段', () => {
    const src = new Slot([ContentType.Text])
    src.insert('ab')
    src.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 2, value: 'p' })
    src.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 2, value: 'q' })
    const delta = src.toDelta()
    const copy = new DeltaLite()
    for (const row of delta) {
      copy.push({
        insert: row.insert,
        formats: row.formats.map(([f, v]) => [f, v]) as typeof row.formats
      })
    }
    delta.attributes.forEach((v, k) => {
      copy.attributes.set(k, v)
    })
    const dst = new Slot([ContentType.Text])
    dst.insert(Slot.emptyPlaceholder)
    dst.retain(0)
    const rest = dst.insertDelta(copy)
    expect(rest.length).toBe(0)
    const ranges = dst.getFormatRangesByFormatter(stackCommentFormatter, 0, dst.length)
    expect(ranges.length).toBe(2)
  })
})
