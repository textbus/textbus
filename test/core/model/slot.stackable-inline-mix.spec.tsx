/**
 * 行内组件 + 文本混排时 stackable 只打在文本段。
 */
import {
  Commander,
  ContentType,
  NativeSelectionBridge,
  RootComponentRef,
  Selection,
  Slot
} from '@textbus/core'
import { NodeSelectionBridge } from '@textbus/platform-node'

import { boldFormatter, Editor, fontSizeFormatter, InlineComponent, RootComponent } from '../../_editor/_api'
import { stackCommentFormatter } from '../../_editor/formatters/stackable-test.formatters'
import { sleep } from '../../util'

const bridgeProviders = [{ provide: NativeSelectionBridge, useClass: NodeSelectionBridge }]

describe('可堆叠格式 — 文本与行内组件混排', () => {
  let editor!: Editor

  afterEach(() => {
    editor.destroy()
  })

  test('applyFormat 跨「文本 + Inline + 文本」时仅在文本段产生 range', async () => {
    editor = new Editor(document.body, {
      providers: bridgeProviders,
      formatters: [boldFormatter, fontSizeFormatter, stackCommentFormatter]
    })
    const rootSlot = new Slot([ContentType.Text, ContentType.InlineComponent])
    const inline = new InlineComponent({
      slot: new Slot([ContentType.Text])
    })
    inline.state.slot.insert('i')
    rootSlot.insert('a')
    rootSlot.insert(inline)
    rootSlot.insert('b')
    const root = new RootComponent({ slot: rootSlot })
    await editor.render(root)
    const ref = editor.get(RootComponentRef)
    const commander = editor.get(Commander)
    const selection = editor.get(Selection)
    selection.setBaseAndExtent(ref.component.state.slot, 0, ref.component.state.slot, 3)
    commander.applyFormat(stackCommentFormatter, 'mix')
    await sleep()
    const innerRanges = inline.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99)
    const rootRanges = ref.component.state.slot.getFormatRangesByFormatter(stackCommentFormatter, 0, 99)
    expect(innerRanges.length).toBe(0)
    expect(rootRanges.length).toBeGreaterThan(0)
  })
})
