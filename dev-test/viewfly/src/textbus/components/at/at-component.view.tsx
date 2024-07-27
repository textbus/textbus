import { ViewComponentProps } from '@textbus/adapter-viewfly'
import { ComponentLoader, SlotParser } from '@textbus/platform-browser'
import { Component, ContentType, Selection, Slot, Textbus } from '@textbus/core'
import { createRef, inject, onUnmounted, onUpdated } from '@viewfly/core'
import { any2Hsl, ColorHSL, hsl2Rgb } from '@tanbo/color'

import { AtComponent } from './at.component'
import './at.component.scss'
import { Dropdown } from '../../../components/dropdown/dropdown'
import { useReadonly } from '../../hooks/use-readonly'
import { useOutput } from '../../hooks/use-output'
import { SlotRender } from '../SlotRender'

export function AtComponentView(props: ViewComponentProps<AtComponent>) {
  const selection = inject(Selection)

  const dropdownRef = createRef<typeof Dropdown>()

  const subscription = props.component.focus.subscribe((b) => {
    if (dropdownRef.current && props.component.members().length) {
      dropdownRef.current.isShow(b)
    }
  })

  onUnmounted(() => {
    subscription.unsubscribe()
  })

  const readonly = useReadonly()
  const output = useOutput()

  const membersRef = createRef<HTMLElement>()
  onUpdated(() => {
    if (output() || readonly()) {
      return
    }
    const container = membersRef.current!
    if (container) {
      const focusItem = container.children[props.component.selectedIndex()]
      if (focusItem) {
        const itemRect = focusItem.getBoundingClientRect()
        const dropdownMenu = container.parentNode!.parentNode as HTMLElement
        const containerRect = dropdownMenu.getBoundingClientRect()
        if (itemRect.top - 5 < containerRect.top) {
          dropdownMenu.scrollTop += itemRect.top - 5 - containerRect.top
        } else if (itemRect.bottom + 5 > containerRect.bottom) {
          dropdownMenu.scrollTop += itemRect.bottom + 5 - containerRect.bottom
        }
      }
    }
  })

  return () => {
    const { slot, userInfo } = props.component.state
    const selectedIndex = props.component.selectedIndex()
    if (userInfo) {
      return (
        <div class="xnote-at xnote-at-complete"
             data-info={encodeURIComponent(JSON.stringify(userInfo))}
             ref={props.rootRef} data-component={props.component.name}>
          <span>@</span>{userInfo.name}
        </div>
      )
    }
    if (readonly() || output()) {
      return (
        <div class="xnote-at"
             ref={props.rootRef}
             data-component={props.component.name}>
          <span>@</span>
          {slot && <SlotRender slot={slot} class="xnote-at-input" tag="span"/>}
        </div>
      )
    }
    const members = props.component.members()

    return (
      <div class="xnote-at"
           ref={props.rootRef}
           data-component={props.component.name}>
        <Dropdown trigger={'none'} ref={dropdownRef} menu={
          <div class="xnote-at-menu" ref={membersRef}>
            {
              members.map((member, index) => {
                let hsl = any2Hsl(member.color)
                if (hsl === 'unknown') {
                  hsl = any2Hsl('#000') as ColorHSL
                }
                const rgb = hsl2Rgb(hsl)
                const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000
                const color = yiq >= 128 ? '#000' : '#fff'

                return (
                  <div onClick={() => {
                    props.component.state.userInfo = member
                    selection.selectComponentEnd(props.component)
                  }} key={member.id} class={['xnote-at-member', { selected: index === selectedIndex }]}>
                    <div class="xnote-at-member-avatar">{
                      member.avatar ? <img src={member.avatar} alt={member.name}/> :
                        <span class="xnote-at-member-avatar-bg" style={{ background: member.color, color }}>{member.name}</span>
                    }</div>
                    <div class="xnote-at-member-info">
                      <div class="xnote-at-member-name">{member.name}</div>
                      <div class="xnote-at-member-desc">{member.groupName}</div>
                    </div>
                  </div>
                )
              })
            }
          </div>
        }>
          <span>@</span>
          {slot && <SlotRender slot={slot} tag="span" class="xnote-at-input"/>}
        </Dropdown>
      </div>
    )
  }
}

export const atComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return element.dataset.component === AtComponent.componentName
  },
  read(element: HTMLElement, textbus: Textbus, slotParser: SlotParser): Component | Slot | void {
    const data = element.dataset.info
    if (data) {
      return new AtComponent(textbus, {
        userInfo: JSON.parse(decodeURIComponent(data))
      })
    }
    const slot = slotParser(
      new Slot([ContentType.Text]),
      element.querySelector('.xnote-at-input') || document.createElement('div')
    )
    return new AtComponent(textbus, {
      slot
    })
  }
}
