import { AsyncSlot, Component, ContentType, createVNode, Slot } from '@textbus/core'
import { ViewComponentProps } from '@textbus/adapter-viewfly'
import { inject } from '@viewfly/core'
import { DomAdapter } from '@textbus/platform-browser'

/** 与 {@link ../../collaborate/caching-sub-model-loader} 中 metadata 字段一致 */
export interface AsyncSlotHolderMeta {
  docId?: string
}

/**
 * 根插槽中可放置的块级组件：持有一个 {@link AsyncSlot}（仅文本），用于多子文档协作测试。
 */
export class AsyncSlotHolder extends Component<{ slot: AsyncSlot<Record<string, unknown>, AsyncSlotHolderMeta> }> {
  static componentName = 'AsyncSlotHolder'
  static type = ContentType.BlockComponent

  constructor(metadata: AsyncSlotHolderMeta = {}) {
    super({
      slot: new AsyncSlot([ContentType.Text], {}, { ...metadata }),
    })
  }

  override getSlots(): Slot[] {
    return [this.state.slot]
  }
}

export function AsyncSlotHolderView(props: ViewComponentProps<AsyncSlotHolder>) {
  const adapter = inject(DomAdapter)
  return () => (
    <section ref={props.rootRef} data-component={AsyncSlotHolder.componentName}>
      {adapter.slotRender(props.component.state.slot, children =>
        createVNode('div', { class: 'async-slot-holder' }, children),
      )}
    </section>
  )
}
