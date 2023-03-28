import { onBlur, onDestroy, useContext, useSelf, VElement } from '@textbus/core'
import classNames from 'classnames'
import { fromEvent } from '@tanbo/stream'
import { VIEW_DOCUMENT } from '@textbus/platform-browser'

export interface SelectOption {
  label: string
  value: any
}

export interface SelectConfig {
  items: SelectOption[]
  defaultValue: any
}

export function useSelector(config: SelectConfig, callback: (current: SelectOption) => void) {
  let isOpen = false
  const self = useSelf()

  onBlur(() => {
    isOpen = false
    self.changeMarker.forceMarkDirtied()
  })
  let current = config.items.find(item => {
    return item.value === config.defaultValue
  })
  const container = useContext(VIEW_DOCUMENT)
  const subscription = fromEvent(container, 'mousedown').subscribe(() => {
    if (isOpen) {
      isOpen = false
      self.changeMarker.forceMarkDirtied()
    }
  })
  onDestroy(() => {
    subscription.unsubscribe()
  })
  return function (): VElement {
    return (
      <div class={classNames('textbus-toolbar-dropdown', {
        'textbus-toolbar-dropdown-open': isOpen
      })}>
        <div class="textbus-toolbar-dropdown-button">
          <span class="textbus-toolbar-item textbus-toolbar-dropdown">
            <button class="textbus-toolbar-button" type="button" onClick={() => {
              isOpen = !isOpen
              self.changeMarker.forceMarkDirtied()
            }}>
              <span class="textbus-toolbar-select-label">{current?.label || ' '}</span>
              <span class="textbus-dropdown-caret"></span>
            </button>
          </span>
        </div>
        <div class="textbus-toolbar-dropdown-menu">
          <div class="textbus-toolbar-select-options">
            {
              config.items.map(item => {
                return (
                  <button class="textbus-toolbar-option" onMousedown={ev => ev.stopPropagation()} type="button" onClick={() => {
                    current = item
                    isOpen = false
                    callback(item)
                    self.changeMarker.forceMarkDirtied()
                  }}>
                    <span class="textbus-toolbar-option-label">{item.label}</span>
                  </button>
                )
              })
            }
          </div>
        </div>
      </div>
    )
  }
}
