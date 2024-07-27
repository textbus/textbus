import { withScopedCSS } from '@viewfly/scoped-css'
import { Props } from '@viewfly/core'

import css from './toolbar-item.scoped.scss'

export function ToolbarItem(props: Props) {
  return withScopedCSS(css, () => {
    return (
      <div class="toolbar-item">
        {props.children}
      </div>
    )
  })
}
