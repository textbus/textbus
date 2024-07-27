import { Slot, createVNode } from '@textbus/core'
import { DomAdapter } from '@textbus/platform-browser'
import { DynamicRef, getCurrentInstance, inject, onUnmounted } from '@viewfly/core'
import { HTMLAttributes } from '@viewfly/platform-browser'


interface Props extends HTMLAttributes<unknown> {
  slot: Slot
  /** 默认值为 div */
  tag?: string
  class?: string
  renderEnv?: boolean
  elRef?: DynamicRef<HTMLElement>
  elKey?: number | string
}

export function SlotRender(props: Props) {
  const adaper = inject(DomAdapter)

  const instance = getCurrentInstance()
  const sub = props.slot.__changeMarker__.onChange.subscribe(() => {
    instance.markAsDirtied()
  })

  onUnmounted(() => {
    sub.unsubscribe()
  })

  return () => {
    const { slot, tag = 'div', renderEnv = false, elRef, elKey, ...rest } = props
    return adaper.slotRender(slot, children => {
      return createVNode(tag, { ref: elRef, key: elKey, ...rest }, children)
    }, renderEnv)
  }
}
