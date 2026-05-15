/**
 * Registry.createSlot：字面量中同一 stackable 名称下多条 range 的还原。
 */
import { ContentType, NativeSelectionBridge, Registry, SlotLiteral } from '@textbus/core'
import { NodeSelectionBridge } from '@textbus/platform-node'

import { boldFormatter, Editor, fontSizeFormatter } from '../../_editor/_api'
import { stackCommentFormatter } from '../../_editor/formatters/stackable-test.formatters'

const bridgeProviders = [{ provide: NativeSelectionBridge, useClass: NodeSelectionBridge }]

describe('Registry — createSlot 可堆叠字面量', () => {
  let editor!: Editor

  beforeEach(() => {
    editor = new Editor(document.createElement('div'), {
      providers: bridgeProviders,
      formatters: [boldFormatter, fontSizeFormatter, stackCommentFormatter]
    })
  })

  afterEach(() => {
    editor.destroy()
  })

  test('同一 stackable 名称多条 range 可还原到 Slot', () => {
    const r = editor.get(Registry)
    const literal: SlotLiteral = {
      schema: [ContentType.Text],
      state: {},
      content: ['ab'],
      attributes: {},
      formats: {
        [stackCommentFormatter.name]: [
          { startIndex: 0, endIndex: 2, value: 'c1' },
          { startIndex: 0, endIndex: 2, value: 'c2' }
        ]
      }
    }
    const slot = r.createSlot(literal)
    expect(slot.sliceContent().join('')).toBe('ab')
    const ranges = slot.getFormatRangesByFormatter(stackCommentFormatter, 0, slot.length)
    expect(ranges.length).toBe(2)
    const vals = ranges.map(x => x.value).sort()
    expect(vals).toEqual(['c1', 'c2'])
  })
})
