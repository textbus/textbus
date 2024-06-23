import { Component, ContentType, createVNode, Slot } from '@textbus/core'
import { ViewComponentProps } from '@textbus/adapter-viewfly'
import { inject } from '@viewfly/core'
import { DomAdapter } from '@textbus/platform-browser'

export interface RootComponentState {
  slot: Slot
}

export class RootComponent extends Component<RootComponentState> {
  static componentName = 'RootComponent'
  static type = ContentType.BlockComponent
}

export function RootComponentView(props: ViewComponentProps<RootComponent>) {
  const adapter = inject(DomAdapter)
  return () => {
    return <div ref={props.rootRef} data-component={RootComponent.componentName}>
      {
        adapter.slotRender(props.component.state.slot, children => {
          return createVNode('div', null, children)
        })
      }
    </div>
  }
}
