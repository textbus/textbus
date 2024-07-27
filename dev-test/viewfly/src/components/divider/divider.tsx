import { withScopedCSS } from '@viewfly/scoped-css'

import css from './divider.scoped.scss'

export function Divider() {
  return withScopedCSS(css, () => {
    return <div class="divider"/>
  })
}
