import { withScopedCSS } from '@viewfly/scoped-css'
import { createSignal, inject, onUnmounted, Props, JSXNode } from '@viewfly/core'

import css from './menu-item.scoped.scss'
import { DropdownContextService } from '../dropdown/dropdown-context.service'

export interface MenuItemProps extends Props {
  disabled?: boolean
  checked?: boolean
  icon?: JSXNode
  value?: any
  arrow?: boolean
  desc?: JSXNode

  onClick?(value: any): void
}

export function MenuItem(props: MenuItemProps) {
  const dropdownContextService = inject(DropdownContextService, null)
  const isActive = createSignal(dropdownContextService?.isOpen || false)
  if (dropdownContextService) {
    const subscription = dropdownContextService.onOpenStateChange.subscribe(b => {
      isActive.set(b)
    })

    onUnmounted(() => {
      subscription.unsubscribe()
    })
  }

  function click() {
    if (props.disabled) {
      return
    }
    props.onClick?.(props.value)
  }

  return withScopedCSS(css, () => {
    return (
      <div class={['menu-item', { disabled: props.disabled, active: props.arrow && isActive() }]} onClick={click}>
        <div class="menu-item-content">
          <div>{
            props.icon && <span class="menu-icon">{props.icon}</span>
          }{props.children}</div>
          <div>{props.desc}</div>
        </div>
        {
          props.arrow ?
            <div class="arrow">
              <span class="xnote-icon-arrow-right"></span>
            </div> :
            <div class={[
              'menu-check',
              { checked: props.checked }
            ]}><span class="xnote-icon-checkmark"></span></div>
        }
      </div>
    )
  })
}
