import { Component, ContentType, createVNode, Registry, Slot, SlotLiteral, Textbus } from '@textbus/core'
import { ViewComponentProps } from '@textbus/adapter-viewfly'
import { inject } from '@viewfly/core'
import { DomAdapter } from '@textbus/platform-browser'

export interface JsonProbeInlineState {
  slot: Slot
  /** 业务字段，用于字面量反序列化断言 */
  caption: string
}

export class JsonProbeInline extends Component<JsonProbeInlineState> {
  static componentName = 'JsonProbeInline'
  static type = ContentType.InlineComponent

  static fromJSON(textbus: Textbus, data: { slot: SlotLiteral; caption: string }) {
    const slot = textbus.get(Registry).createSlot(data.slot)
    return new JsonProbeInline({ slot, caption: data.caption })
  }

  override getSlots(): Slot[] {
    return [this.state.slot]
  }
}

export function JsonProbeInlineView(props: ViewComponentProps<JsonProbeInline>) {
  const adapter = inject(DomAdapter)
  return () => {
    return (
      <span ref={props.rootRef} data-json-probe-inline={props.component.state.caption}>
        {adapter.slotRender(props.component.state.slot, children => {
          return createVNode('span', { class: 'json-probe-inline-slot' }, children)
        })}
      </span>
    )
  }
}
