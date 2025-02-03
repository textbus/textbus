import { Adapter, createVNode, Slot } from '@textbus/core'
import { getCurrentInstance, inject } from '@viewfly/core'
import { merge } from '@tanbo/stream'

export function SlotRender(props: {slot: Slot}) {
  const i = getCurrentInstance()
  const slot = props.slot
  merge(slot.__changeMarker__.onChange, slot.__changeMarker__.onForceChange).subscribe(() => {
    if (props.slot.__changeMarker__.dirty) {
      i.markAsDirtied()
    }
  })
  const adapter = inject(Adapter)
  // console.log(adapter, '=====')
  return () => {
    return adapter.slotRender(props.slot, children => {
      return createVNode('div', {
        'textbus-document': 'true',
      }, children)
    })
  }
}
