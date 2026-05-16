/**
 * Query + 可堆叠：同段多取值时 queryFormat 的合并语义。
 */
import {
  ContentType,
  NativeSelectionBridge,
  Query,
  QueryStateType,
  RootComponentRef,
  Selection,
  Slot
} from '@textbus/core'
import { NodeSelectionBridge } from '@textbus/platform-node'

import { boldFormatter, Editor, fontSizeFormatter, RootComponent } from '../../_editor/_api'
import { stackCommentFormatter } from '../../_editor/formatters/stackable-test.formatters'
import { sleep } from '../../util'

const bridgeProviders = [{ provide: NativeSelectionBridge, useClass: NodeSelectionBridge }]

describe('Query — 可堆叠格式', () => {
  let editor!: Editor

  beforeEach(() => {
    editor = new Editor(document.body, {
      providers: bridgeProviders,
      formatters: [boldFormatter, fontSizeFormatter, stackCommentFormatter]
    })
  })

  afterEach(() => {
    editor.destroy()
  })

  test('选区覆盖同段两条重叠 stack 时 queryFormat 为 Enabled 且 value 为多条取值', async () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abc')
    slot.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 3, value: 'u1' })
    slot.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 3, value: 'u2' })
    const root = new RootComponent({ slot })
    await editor.render(root)
    await sleep()
    const selection = editor.get(Selection)
    const query = editor.get(Query)
    const ref = editor.get(RootComponentRef)
    selection.setBaseAndExtent(ref.component.state.slot, 0, ref.component.state.slot, 3)
    const r = query.queryFormat(stackCommentFormatter)
    expect(r.state).toBe(QueryStateType.Enabled)
    expect(r.value).toEqual(['u1', 'u2'])
  })

  test('选区跨相邻两段 stack（L/R）时 queryFormat 为 Enabled 且 value 按区间顺序', async () => {
    const slot = new Slot([ContentType.Text])
    slot.insert('abcd')
    slot.applyFormat(stackCommentFormatter, { startIndex: 0, endIndex: 2, value: 'L' })
    slot.applyFormat(stackCommentFormatter, { startIndex: 2, endIndex: 4, value: 'R' })
    const root = new RootComponent({ slot })
    await editor.render(root)
    await sleep()
    const selection = editor.get(Selection)
    const query = editor.get(Query)
    const ref = editor.get(RootComponentRef)
    selection.setBaseAndExtent(ref.component.state.slot, 0, ref.component.state.slot, 3)
    const r = query.queryFormat(stackCommentFormatter)
    expect(r.state).toBe(QueryStateType.Enabled)
    expect(r.value).toEqual(['L', 'R'])
  })
})
