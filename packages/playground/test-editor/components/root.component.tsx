import { Component, ContentType, onContentInsert, Registry, Selection, Slot, Textbus, useContext } from '@textbus/core'
import { ParagraphComponent } from './paragraph.component'
import { ViewComponentProps } from '@textbus/adapter-viewfly'

import { SlotRender } from '../common/slot-render'

export interface RooComponentState {
  slot: Slot,
  items: number[]
}

export class RootComponent extends Component<RooComponentState> {
  static componentName = 'RootComponent'
  static type = ContentType.BlockComponent

  static fromJSON(textbus: Textbus, state: any) {
    state.slot = textbus.get(Registry).createSlot(state.slot)
    return new RootComponent(state)
  }

  override getSlots(): Slot[] {
    return [this.state.slot]
  }

  override setup() {
    const selection = useContext(Selection)
    onContentInsert(ev => {
      if (typeof ev.data.content === 'string' || ev.data.content.type !== ContentType.BlockComponent) {
        const slot = new Slot([
          ContentType.Text
        ])
        const p = new ParagraphComponent({
          slot
        })
        slot.insert(ev.data.content)
        ev.target.insert(p)
        selection.setPosition(slot, slot.index)
        ev.preventDefault()
      }
    })
  }
}

export function RootComponentView(props: ViewComponentProps<RootComponent>) {
  const { slot } = props.component.state

  ;(window as any)['testItems'] = props.component.state.items
  return () => {
    return (
      <div ref={props.rootRef}>
        <div>{props.component.state.items.join('')}</div>
        <SlotRender slot={slot}/>
      </div>
    )
  }
}
