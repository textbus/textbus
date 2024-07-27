import { ContentType, onBreak, onContentInsert, Selection, Slot, useContext } from '@textbus/core'

import { ParagraphComponent } from '../components/paragraph/paragraph.component'

export function useBlockContent(slot: Slot | ((slot: Slot) => boolean)) {
  const textbus = useContext()
  const selection = textbus.get(Selection)
  onBreak(ev => {
    if (typeof slot === 'function' ? slot(ev.target) : ev.target === slot) {
      const p = new ParagraphComponent(textbus)
      ev.target.insert(p)
      selection.setPosition(p.state.slot, 0)
      ev.preventDefault()
    }
  })

  onContentInsert(ev => {
    if ((typeof slot === 'function' ? slot(ev.target) : ev.target === slot) &&
      (typeof ev.data.content === 'string' || ev.data.content.type !== ContentType.BlockComponent)) {
      const p = new ParagraphComponent(textbus)
      const childSlot = p.state.slot
      childSlot.insert(ev.data.content)
      ev.target.insert(p)
      selection.setPosition(childSlot, childSlot.index)
      ev.preventDefault()
    }
  })
}
