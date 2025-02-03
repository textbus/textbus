import { Component, ContentType, createVNode, Slot } from '@textbus/core'
import { ViewComponentProps } from '@textbus/adapter-viewfly'
import { inject } from '@viewfly/core'
import { DomAdapter } from '@textbus/platform-browser'

export interface InlineComponentState {
  slot: Slot
}

export class InlineComponent extends Component<InlineComponentState> {
  static componentName = 'InlineComponent'
  static type = ContentType.InlineComponent

  override getSlots(): Slot[] {
    return [this.state.slot]
  }
}

export function InlineComponentView(props: ViewComponentProps<InlineComponent>) {
  const adapter = inject(DomAdapter)
  return () => {
    return <span ref={props.rootRef} data-component={InlineComponent.componentName}>
      {
        adapter.slotRender(props.component.state.slot, children => {
          return createVNode('span', null, children)
        })
      }
    </span>
  }
}
