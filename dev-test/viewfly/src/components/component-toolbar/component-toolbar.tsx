import { withScopedCSS } from '@viewfly/scoped-css'
import { StyleValue } from '@viewfly/platform-browser'
import { Props } from '@viewfly/core'

import css from './component-toolbar.scoped.scss'

export interface ComponentToolbarProps extends Props {
  visible?: boolean
  style?: StyleValue
  innerStyle?: StyleValue
}

export function ComponentToolbar(props: ComponentToolbarProps) {
  return withScopedCSS(css, () => {
    return (
      <div class="component-toolbar" style={props.style}>
        <div class={[
          'toolbar',
          {
            active: props.visible
          }
        ]} style={props.innerStyle}>
          {props.children}
        </div>
      </div>
    )
  })
}
