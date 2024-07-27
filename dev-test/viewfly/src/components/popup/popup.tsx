import { inject, Props } from '@viewfly/core'
import { createPortal } from '@viewfly/platform-browser'
import { VIEW_CONTAINER } from '@textbus/platform-browser'
import { withScopedCSS } from '@viewfly/scoped-css'

import css from './popup.scoped.scss'

export interface PopupProps extends Props {
  left: number
  top: number
}

export function Popup(props: PopupProps) {
  const host = inject(VIEW_CONTAINER)
  return createPortal(withScopedCSS(css, () => {
    return (
      <div class="popup" style={{
        left: props.left + 'px',
        top: props.top + 'px'
      }}>
        {props.children}
      </div>
    )
  }), host)
}
