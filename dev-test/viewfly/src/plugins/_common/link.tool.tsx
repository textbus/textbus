import { createRef, createSignal, inject, onUnmounted } from '@viewfly/core'
import { SelectionBridge, VIEW_CONTAINER } from '@textbus/platform-browser'
import { withScopedCSS } from '@viewfly/scoped-css'
import { Commander, fromEvent, Selection } from '@textbus/core'

import css from './link-tool.scoped.scss'
import { Popup } from '../../components/popup/popup'
import { Button } from '../../components/button/button'
import { linkFormatter } from '../../textbus/formatters/link'
import { EditorService } from '../../services/editor.service'

export interface LinkToolProps {
  hideToolbar?(): void
}

export function LinkTool(props: LinkToolProps) {
  const selectionBridge = inject(SelectionBridge)
  const selection = inject(Selection)
  const commander = inject(Commander)
  const editorService = inject(EditorService)
  const container = inject(VIEW_CONTAINER)

  const isShow = createSignal(false)
  const value = createSignal('')

  function setLink(ev: Event) {
    ev.preventDefault()
    commander.applyFormat(linkFormatter, {
      href: value(),
      target: '_blanK'
    } as any)
    isShow.set(false)
  }

  let isClickFromSelf = false
  const sub = fromEvent(document, 'click').subscribe(() => {
    if (isClickFromSelf) {
      isClickFromSelf = false
      return
    }
    editorService.hideInlineToolbar = false
    isShow.set(false)
  })

  onUnmounted(() => {
    sub.unsubscribe()
  })

  return withScopedCSS(css, () => {
    const containerRect = container.getBoundingClientRect()
    const rect = isShow() ? selectionBridge.getRect({
      slot: selection.focusSlot!,
      offset: selection.focusOffset!
    }) : {} as any
    return (
      <span>
        <Button onClick={() => {
          isShow.set(true)
          isClickFromSelf = true
          props.hideToolbar?.()
        }}><span class="xnote-icon-link"></span></Button>
        {
          isShow() &&
          <Popup left={rect.left - containerRect.left} top={rect.top + rect.height - containerRect.top}>
            <form onSubmit={setLink} onClick={() => {
              isClickFromSelf = true
            }} class="input-group">
              <input onChange={ev => {
                value.set((ev.target as any).value)
              }} placeholder="请输入链接地址" type="text"/>
              <Button type="submit">确定</Button>
            </form>
          </Popup>
        }
      </span>
    )
  })
}
