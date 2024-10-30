import { Component, ComponentStateLiteral, ContentType, Registry, Slot, Textbus } from '@textbus/core'

import { ParagraphComponent } from '../paragraph/paragraph.component'
import { fontSizeFormatter } from '../../formatters/font-size'
import { boldFormatter } from '../../formatters/bold'
import { colorFormatter } from '../../formatters/color'

export interface TimelineComponentItem {
  theme: string
  slot: Slot
}

export interface TimelineComponentState {
  items: TimelineComponentItem[]
}

export function createTimelineItem(textbus: Textbus, theme: string): TimelineComponentItem {
  const slot = new Slot([
    ContentType.BlockComponent,
  ])

  const title = new ParagraphComponent(textbus)
  title.state.slot.insert('时间主题', [
    [fontSizeFormatter, '18px'],
    [boldFormatter, true]
  ])
  title.state.slot.insert(' 2020-02-02', [
    [fontSizeFormatter, '15px'],
    [colorFormatter, '#777']
  ])

  const desc = new ParagraphComponent(textbus)
  desc.state.slot.insert('描述信息...')
  slot.insert(title)
  slot.insert(desc)
  return { theme, slot }
}

export class TimelineComponent extends Component<TimelineComponentState> {
  static componentName = 'TimelineComponent'
  static type = ContentType.BlockComponent

  static fromJSON(textbus: Textbus, json: ComponentStateLiteral<TimelineComponentState>): TimelineComponent {
    const registry = textbus.get(Registry)

    return new TimelineComponent(textbus, {
      items: json.items.map(i => {
        return {
          theme: i.theme,
          slot: registry.createSlot(i.slot)
        }
      })
    })
  }

  override getSlots(): Slot[] {
    return this.state.items.map(i => i.slot)
  }
}
