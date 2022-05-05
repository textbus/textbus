import { createElement } from '@textbus/browser'
import { fromEvent } from '@tanbo/stream'

function fixPosition(wrapper: HTMLElement, menu: HTMLElement, stickyElement: HTMLElement) {
  const distance = stickyElement.getBoundingClientRect().right - (wrapper.getBoundingClientRect().left + menu.offsetWidth)
  menu.style.left = `${Math.min(0, distance)}px`
}

export function createDropdown(button: HTMLElement, menu: HTMLElement, stickyElement: HTMLElement) {
  const menuWrapper = createElement('div', {
    classes: ['textbus-toolbar-dropdown-menu'],
    children: [menu],
    on: {
      click(ev) {
        ev.stopPropagation()
      }
    }
  })
  const element = createElement('div', {
    classes: ['textbus-toolbar-dropdown'],
    children: [
      createElement('div', {
        classes: ['textbus-toolbar-dropdown-button'],
        children: [button]
      }),
      menuWrapper
    ]
  })

  function updatePosition() {
    if (element.classList.contains('textbus-toolbar-dropdown-open')) {
      return
    }

    fixPosition(element, menuWrapper, stickyElement)
  }

  const unListen = fromEvent(window, 'resize').subscribe(() => {
    updatePosition()
  })

  const dropdown = {
    elementRef: element,
    toggle() {
      if (element.classList.contains('textbus-toolbar-dropdown-open')) {
        dropdown.hide()
        return
      }
      dropdown.open()
    },
    open() {
      updatePosition()
      element.classList.add('textbus-toolbar-dropdown-open')
    },
    hide() {
      element.classList.remove('textbus-toolbar-dropdown-open')
    },
    destroy() {
      unListen.unsubscribe()
    }
  }
  return dropdown
}
