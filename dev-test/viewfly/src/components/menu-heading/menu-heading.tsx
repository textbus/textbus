import { Props } from '@viewfly/core'
import { withScopedCSS } from '@viewfly/scoped-css'

import css from './menu-heading.scoped.scss'

export function MenuHeading(props: Props) {
  return withScopedCSS(css, () => {
    return (
      <div class="menu-heading">
        {props.children}
      </div>
    )
  })
}
