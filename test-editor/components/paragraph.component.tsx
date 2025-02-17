import {
  Adapter,
  Commander,
  Component,
  ContentType,
  createVNode,
  onBreak,
  Registry,
  Selection,
  Slot,
  Textbus,
  useContext,
  useSelf
} from '@textbus/core'
import { ViewComponentProps } from '@textbus/adapter-viewfly'
import { inject } from '@viewfly/core'

export interface ParagraphComponentState {
  slot: Slot
}

export class ParagraphComponent extends Component<ParagraphComponentState> {
  static componentName = 'ParagraphComponent'

  static type = ContentType.BlockComponent

  static fromJSON(textbus: Textbus, state: any) {
    state.slot = textbus.get(Registry).createSlot(state.slot)
    return new ParagraphComponent(state)
  }

  override getSlots(): Slot[] {
    return [this.state.slot]
  }

  override setup() {
    const commander = useContext(Commander)
    const selection = useContext(Selection)
    const self = useSelf()

    onBreak(ev => {
      ev.preventDefault()
      const nextContent = ev.target.cut(ev.data.index)
      const p = new ParagraphComponent({
        slot: nextContent
      })
      commander.insertAfter(p, self)
      selection.setPosition(nextContent, 0)
    })
  }
}

export function ParagraphComponentView(props: ViewComponentProps<ParagraphComponent>) {
  const slot = props.component.state.slot
  const adapter = inject(Adapter)
  return () => {
    // console.log('paragraphComponent')
    return (
      adapter.slotRender(slot, children => {
        return createVNode('p', { ref: props.rootRef }, children)
      })
    )
  }
}
