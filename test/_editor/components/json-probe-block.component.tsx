import { Component, ContentType, createVNode, Registry, Slot, SlotLiteral, Textbus } from '@textbus/core'
import { ViewComponentProps } from '@textbus/adapter-viewfly'
import { inject } from '@viewfly/core'
import { DomAdapter } from '@textbus/platform-browser'

export interface JsonProbeBlockState {
  slot: Slot
  blockId: number
}

export class JsonProbeBlock extends Component<JsonProbeBlockState> {
  static componentName = 'JsonProbeBlock'
  static type = ContentType.BlockComponent

  static fromJSON(textbus: Textbus, data: { slot: SlotLiteral; blockId: number }) {
    const slot = textbus.get(Registry).createSlot(data.slot)
    return new JsonProbeBlock({ slot, blockId: data.blockId })
  }

  override getSlots(): Slot[] {
    return [this.state.slot]
  }
}

export function JsonProbeBlockView(props: ViewComponentProps<JsonProbeBlock>) {
  const adapter = inject(DomAdapter)
  return () => {
    return (
      <div ref={props.rootRef} data-json-probe-block-id={String(props.component.state.blockId)}>
        {adapter.slotRender(props.component.state.slot, children => {
          return createVNode('article', { class: 'json-probe-block' }, children)
        })}
      </div>
    )
  }
}
