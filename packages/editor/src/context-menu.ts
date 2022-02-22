import { Inject, Injectable } from '@tanbo/di'
import { fromEvent, Subscription } from '@tanbo/stream'
import {
  Commander,
  ComponentInstance,
  ContentType,
  ContextMenuItem,
  invokeListener,
  Renderer,
  Slot,
  Event,
  Selection
} from '@textbus/core'
import { createElement, createTextNode, EDITABLE_DOCUMENT, EDITOR_CONTAINER, Parser } from '@textbus/browser'
import { I18n } from './i18n'
import { Message } from './message'

@Injectable()
export class ContextMenu {
  private elementRef: HTMLElement

  private eventFromSelf = false
  private groups: HTMLElement

  private subs: Subscription[] = []

  constructor(@Inject(EDITABLE_DOCUMENT) private editorDocument: Document,
              @Inject(EDITOR_CONTAINER) private container: HTMLElement,
              private i18n: I18n,
              private parser: Parser,
              private message: Message,
              private renderer: Renderer,
              private commander: Commander,
              private selection: Selection) {
    this.elementRef = createElement('div', {
      classes: ['textbus-contextmenu'],
      children: [
        createElement('div', {
          classes: ['textbus-contextmenu-container'],
          children: [
            this.groups = createElement('div', {
              classes: ['textbus-contextmenu-groups']
            })
          ]
        })
      ]
    })
    this.subs.push(
      fromEvent(this.elementRef, 'contextmenu').subscribe(ev => {
        ev.preventDefault()
      }),
      fromEvent(editorDocument, 'mousedown').subscribe(() => {
        this.hide()
      }),
      fromEvent<MouseEvent>(editorDocument, 'contextmenu').subscribe((ev) => {
        const nativeSelection = editorDocument.getSelection()!
        const focusNode = nativeSelection.focusNode
        const offset = nativeSelection.focusOffset
        const isCollapsed = nativeSelection.isCollapsed
        setTimeout(() => {
          if (isCollapsed) {
            if (!nativeSelection.isCollapsed) {
              nativeSelection.collapse(focusNode, offset)
            }
          }
        })
        const rect = this.container.getBoundingClientRect()
        const menus = this.makeContextmenu()
        const defaultMenus: ContextMenuItem[] = [{
          iconClasses: ['textbus-icon-copy'],
          label: this.i18n.get('editor.copy'),
          disabled: this.selection.isCollapsed,
          onClick: () => {
            this.commander.copy()
          }
        }, {
          iconClasses: ['textbus-icon-paste'],
          label: this.i18n.get('editor.paste'),
          // disabled: true,
          onClick: () => {
            navigator.permissions.query({name: 'clipboard-write'} as any).then((result) => {
              if (result.state === 'granted') {
                (navigator.clipboard as any).read().then((items: any[]) => {
                  const item = items[0]
                  item.types.filter((i: string) => i === 'text/html').forEach((type: string) => {
                    (item.getType(type) as Promise<Blob>).then(blob => {
                      return blob.text()
                    }).then(text => {
                      const div = document.createElement('div')
                      div.innerHTML = text
                      this.commander.paste(this.parser.parse(text, new Slot([
                        ContentType.BlockComponent,
                        ContentType.Text,
                        ContentType.InlineComponent
                      ])), div.innerText)
                    })
                  })
                })
              } else {
                this.message.danger(this.i18n.get('editor.input.canNotAccessClipboard'))
              }
            })
          }
        }, {
          iconClasses: ['textbus-icon-cut'],
          label: this.i18n.get('editor.cut'),
          disabled: this.selection.isCollapsed,
          onClick: () => {
            this.commander.cut()
          }
        }, {
          iconClasses: ['textbus-icon-select'],
          label: this.i18n.get('editor.selectAll'),
          onClick: () => {
            this.selection.selectAll()
          }
        }]

        this.show([
          defaultMenus,
          ...menus
        ], ev.pageX + rect.x, ev.pageY + rect.y
        )
        ev.preventDefault()
      })
    )
  }

  destroy() {
    this.hide()
    this.subs.forEach(i => i.unsubscribe())
    this.subs = []
  }

  private makeContextmenu() {
    const startSlot = this.selection.startSlot
    if (!startSlot) {
      return []
    }
    let component: ComponentInstance | null = startSlot.getContentAtIndex(this.selection.startOffset! - 1) as ComponentInstance
    if (!component || typeof component === 'string') {
      component = this.selection.commonAncestorComponent!
    }
    if (!component) {
      return []
    }
    const menuItems: ContextMenuItem[][] = []
    while (component) {
      invokeListener(
        component as ComponentInstance,
        'onContextMenu',
        new Event<null>(startSlot, null, (...menus: ContextMenuItem[][]) => {
          menuItems.push(...menus)
        }))
      component = component.parent?.parent || null
    }
    return menuItems
  }

  private hide() {
    this.elementRef.parentNode?.removeChild(this.elementRef)
  }

  private show(menus: ContextMenuItem[][], x: number, y: number) {
    this.subs.push(
      fromEvent(document, 'mousedown').subscribe(() => {
        if (!this.eventFromSelf) {
          this.hide()
        }
      }),
      fromEvent(window, 'resize').subscribe(() => {
        setPosition()
      })
    )
    this.groups.innerHTML = ''

    const setPosition = () => {
      const clientWidth = document.documentElement.clientWidth
      const clientHeight = document.documentElement.clientHeight
      if (x + menuWidth >= clientWidth) {
        x -= menuWidth
      }
      if (y + menuHeight >= clientHeight - 20) {
        y = clientHeight - menuHeight - 20
      }

      if (y < 20) {
        y = 20
      }
      Object.assign(this.elementRef.style, {
        left: x + 'px',
        top: y + 'px'
      })
      this.elementRef.style.maxHeight = clientHeight - y - 20 + 'px'
    }


    let itemCount = 0
    menus.forEach(actions => {
      itemCount += actions.length
      if (actions.length === 0) {
        return
      }
      this.groups.appendChild(createElement('div', {
        classes: ['textbus-contextmenu-group'],
        children: actions.map(item => {
          const btn = createElement('button', {
            attrs: {
              type: 'button'
            },
            props: {
              disabled: item.disabled
            },
            classes: ['textbus-contextmenu-item'],
            children: [
              createElement('span', {
                classes: ['textbus-contextmenu-item-icon'],
                children: [
                  createElement('span', {
                    classes: item.iconClasses || []
                  })
                ]
              }),
              createElement('span', {
                classes: ['textbus-contextmenu-item-label'],
                children: [createTextNode(item.label)]
              })
            ]
          })
          if (!item.disabled) {
            btn.addEventListener('mousedown', () => {
              this.eventFromSelf = true
            })
            btn.addEventListener('click', () => {
              this.hide()
              item.onClick()
              this.eventFromSelf = false
            })
          }
          return btn
        })
      }))
    })

    const menuWidth = 180 + 10
    const menuHeight = itemCount * 26 + menus.length * 10 + menus.length + 10

    setPosition()

    document.body.appendChild(this.elementRef)
  }
}
