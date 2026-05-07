import { Component, ContentType, createVNode, Slot, ZenCodingGrammarInterceptor } from '@textbus/core'
import { ViewComponentProps } from '@textbus/adapter-viewfly'
import { inject } from '@viewfly/core'
import { DomAdapter } from '@textbus/platform-browser'

export interface ZenBlockState {
  slot: Slot
}

/** 仅用于 Keyboard Zen 静态语法糖测试：根槽输入 `zb` + 空格展开 */
export class ZenBlock extends Component<ZenBlockState> {
  static componentName = 'ZenBlock'
  static type = ContentType.BlockComponent
  static zenCoding: ZenCodingGrammarInterceptor<ZenBlockState> = {
    match: /^zb$/,
    key: ' ',
    createState: () => ({ slot: new Slot([ContentType.Text]) })
  }

  override getSlots(): Slot[] {
    return [this.state.slot]
  }
}

export function ZenBlockView(props: ViewComponentProps<ZenBlock>) {
  const adapter = inject(DomAdapter)
  return () => {
    return (
      <div ref={props.rootRef} data-component={ZenBlock.componentName}>
        {adapter.slotRender(props.component.state.slot, children => {
          return createVNode('section', null, children)
        })}
      </div>
    )
  }
}
