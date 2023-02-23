import { onBlur, onFocus, useSelf, VElement, VTextNode } from '@textbus/core'

export function useComponentToolbar() {
  let isShow = false
  const self = useSelf()
  onFocus(() => {
    isShow = true
    self.changeMarker.forceMarkDirtied()
  })
  onBlur(() => {
    isShow = false
    self.changeMarker.forceMarkDirtied()
  })
  return function (props: {children?: Array<VElement|VTextNode>}): VElement {
    return (
      <div class="tb-component-toolbar" style={{
        display: isShow ? 'block' : 'none'
      }} onMousedown={ev => {
        ev.preventDefault()
        return false
      }}>
        <div class="tb-component-toolbar-inner">
          {props.children}
        </div>
      </div>
    )
  }
}
