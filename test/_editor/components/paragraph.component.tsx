import { Component, ContentType, createVNode, Slot } from '@textbus/core'
import { ViewComponentProps } from '@textbus/adapter-viewfly'
import { inject } from '@viewfly/core'
import { DomAdapter } from '@textbus/platform-browser'

export interface ParagraphComponentState {
  slot: Slot
}

export class ParagraphComponent extends Component<ParagraphComponentState> {
  static componentName = 'ParagraphComponent'
  static type = ContentType.BlockComponent

  override getSlots(): Slot[] {
    return [this.state.slot]
  }
}

export function ParagraphComponentView(props: ViewComponentProps<ParagraphComponent>) {
  const adapter = inject(DomAdapter)
  return () => {
    return <div ref={props.rootRef} data-component={ParagraphComponent.componentName}>
      {
        adapter.slotRender(props.component.state.slot, children => {
          return createVNode('p', null, children)
        })
      }
    </div>
  }
}
