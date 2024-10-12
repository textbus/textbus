import { Component, ComponentStateLiteral, ContentType, Registry, Slot, Textbus } from '@textbus/core'

import { ParagraphComponent } from '../paragraph/paragraph.component'
import { fontSizeFormatter } from '../../formatters/font-size'
import { boldFormatter } from '../../formatters/bold'

export interface StepComponentItem {
  slot: Slot
}

export interface StepComponentState {
  step: number
  items: StepComponentItem[]
}

export function createStepItem(textbus: Textbus): StepComponentItem {
  const slot = new Slot([
    ContentType.BlockComponent
  ])

  const title = new ParagraphComponent(textbus)
  title.state.slot.insert('标题', [
    [fontSizeFormatter, '18px'],
    [boldFormatter, true]
  ])
  const content = new ParagraphComponent(textbus)
  content.state.slot.insert('描述信息...')
  slot.insert(title)
  slot.insert(content)
  return { slot }
}

export class StepComponent extends Component<StepComponentState> {
  static componentName = 'StepComponent'
  static type = ContentType.BlockComponent

  static fromJSON(textbus: Textbus, json: ComponentStateLiteral<StepComponentState>): StepComponent {
    const registry = textbus.get(Registry)

    return new StepComponent(textbus, {
      step: json.step,
      items: json.items.map(i => {
        return {
          slot: registry.createSlot(i.slot)
        }
      })
    })
  }

  override getSlots(): Slot[] {
    return this.state.items.map(i => i.slot)
  }
}
