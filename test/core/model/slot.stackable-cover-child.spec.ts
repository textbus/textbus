/**
 * background + 块级子插槽：可堆叠格式是否按 applyFormatCoverChild 写入子槽正文。
 */
import { ContentType, Slot, Textbus } from '@textbus/core'
import { NodeModule, NodeViewAdapter } from '@textbus/platform-node'

import { ParagraphComponent } from '../../_editor/_api'
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

describe('可堆叠格式 — applyFormatCoverChild（块子槽）', () => {
  test('background 中 retain 可把 stackable 写入块组件正文插槽', () => {
    const root = new Slot([ContentType.Text, ContentType.BlockComponent])
    const paragraph = new ParagraphComponent({
      slot: new Slot([ContentType.Text])
    })
    paragraph.state.slot.insert('hi')
    root.insert(paragraph)
    root.background(() => {
      root.retain(0)
      root.retain(1, stackCommentFormatter, 'from-root')
    })
    const inner = paragraph.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99)
    expect(inner.length).toBeGreaterThan(0)
    expect(inner[0].value).toBe('from-root')
    expect(inner[0].startIndex).toBe(0)
    expect(inner[0].endIndex).toBe(2)
  })
})
