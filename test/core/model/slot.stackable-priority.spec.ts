/**
 * stackable 与普通格式同段时的 toTree（priority 嵌套）。
 */
import { ContentType, createVNode, Slot, Textbus } from '@textbus/core'
import { NodeModule, NodeViewAdapter } from '@textbus/platform-node'

import { boldFormatter } from '../../_editor/formatters/bold.formatter'
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

describe('可堆叠格式 — 与 bold 同段 toTree', () => {
  test('同段 stack + bold 可生成树且不抛错', () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('ab')
    slot.applyFormat(boldFormatter, { startIndex: 0, endIndex: 2, value: true })
    slot.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 2, value: 's' })
    const tree = slot.toTree(children => createVNode('div', null, children))
    expect(tree).toBeTruthy()
    expect(tree.children?.length).toBeGreaterThan(0)
  })
})
