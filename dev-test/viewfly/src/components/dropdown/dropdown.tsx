import {
  createRef,
  createSignal,
  inject,
  JSXNode,
  onMounted,
  onUnmounted,
  Props,
  withAnnotation,
} from '@viewfly/core'
import { withScopedCSS } from '@viewfly/scoped-css'
import { fromEvent, Subscription } from '@textbus/core'
import { HTMLAttributes } from '@viewfly/platform-browser'

import css from './dropdown.scoped.scss'
import { DropdownMenuPortal } from './dropdown-menu'
import { DropdownContextService } from './dropdown-context.service'

export type DropdownTriggerTypes = 'hover' | 'click' | 'none'

export interface DropdownMenu {
  disabled?: boolean
  label: JSXNode
  value: any
}

export interface DropdownProps extends Props {
  trigger?: DropdownTriggerTypes
  menu: DropdownMenu[] | JSXNode
  width?: string
  class?: HTMLAttributes<HTMLElement>['class']
  style?: HTMLAttributes<HTMLElement>['style']
  abreast?: boolean
  padding?: string
  toLeft?: boolean

  onCheck?(value: any): void

  onExpendStateChange?(is: boolean): void
}

export const Dropdown = withAnnotation({
  providers: [DropdownContextService]
}, function Dropdown(props: DropdownProps) {
  const isShow = createSignal(false)

  const dropdownContextService = inject(DropdownContextService)

  const toggle = () => {
    if (dropdownContextService.isOpen) {
      dropdownContextService.hide(false)
    } else {
      dropdownContextService.open()
    }
  }

  const triggerRef = createRef<HTMLElement>()
  const dropdownRef = createRef<HTMLElement>()


  onMounted(() => {
    const sub = dropdownContextService.onOpenStateChange.subscribe(b => {
      props.onExpendStateChange?.(b)
      isShow.set(b)
    })

    return () => sub.unsubscribe()
  })

  const subscription = new Subscription()
  onMounted(() => {
    if (props.trigger === 'none') {
      return
    }
    if (props.trigger === 'click') {
      subscription.add(fromEvent(triggerRef.current!, 'click').subscribe(toggle))
      return
    }
    let leaveSub: Subscription
    const bindLeave = function () {
      leaveSub = fromEvent(dropdownRef.current!, 'mouseleave').subscribe(() => {
        dropdownContextService.hide()
      })
    }
    bindLeave()
    subscription.add(
      fromEvent(dropdownRef.current!, 'mouseenter').subscribe(() => {
        if (leaveSub) {
          leaveSub.unsubscribe()
        }
        bindLeave()
        dropdownContextService.open()
      })
    )
  })

  onUnmounted(() => {
    subscription.unsubscribe()
  })

  return {
    isShow(b: boolean) {
      if (b) {
        dropdownContextService.open()
      } else {
        dropdownContextService.hide(false)
      }
    },
    $render: withScopedCSS(css, () => {
      return (
        <div class={['dropdown', props.class]} style={props.style} ref={dropdownRef}>
          <div class="dropdown-btn" ref={triggerRef}>
            <div class="dropdown-btn-inner">
              {props.children}
            </div>
            <div class="dropdown-btn-arrow"/>
          </div>
          {
            isShow() &&
            <DropdownMenuPortal toLeft={props.toLeft} padding={props.padding} noTrigger={props.trigger === 'none'} width={props.width}
                                abreast={props.abreast} triggerRef={triggerRef}>
              {
                Array.isArray(props.menu) ?
                  props.menu.map(menu => {
                    return (
                      <div class="dropdown-menu-item" onClick={() => {
                        if (menu.disabled) {
                          return
                        }
                        props.onCheck?.(menu.value)
                      }}>{menu.label}</div>
                    )
                  }) :
                  props.menu
              }
            </DropdownMenuPortal>
          }
        </div>
      )
    })
  }
})
