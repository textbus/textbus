import {
  Component,
  ContentType,
  createVNode,
  Registry,
  Slot,
  SlotLiteral,
  Textbus,
} from '@textbus/core'
import { ViewComponentProps } from '@textbus/adapter-viewfly'
import { inject } from '@viewfly/core'
import { DomAdapter } from '@textbus/platform-browser'

export interface StateProbeState {
  slot: Slot
  nums: number[]
  nest: { x: number }
}

export class StateProbe extends Component<StateProbeState> {
  static componentName = 'StateProbe'
  static type = ContentType.BlockComponent

  static fromJSON(textbus: Textbus, data: { slot: SlotLiteral; nums: number[]; nest: { x: number } }) {
    const slot = textbus.get(Registry).createSlot(data.slot)
    return new StateProbe({
      slot,
      nums: [...data.nums],
      nest: { ...data.nest },
    })
  }

  override getSlots(): Slot[] {
    return [this.state.slot]
  }
}

export function StateProbeView(props: ViewComponentProps<StateProbe>) {
  const adapter = inject(DomAdapter)
  return () => (
    <section ref={props.rootRef} data-component={StateProbe.componentName}>
      {adapter.slotRender(props.component.state.slot, children =>
        createVNode('div', { class: 'state-probe' }, children),
      )}
    </section>
  )
}
