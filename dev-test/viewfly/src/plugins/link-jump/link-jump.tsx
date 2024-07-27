import { createRef, createSignal, inject } from '@viewfly/core'
import { delay, Query, QueryStateType, Selection } from '@textbus/core'
import { withScopedCSS } from '@viewfly/scoped-css'
import { SelectionBridge, VIEW_CONTAINER } from '@textbus/platform-browser'
import { createPortal } from '@viewfly/platform-browser'

import css from './link-jump.scoped.scss'
import { linkFormatter } from '../../textbus/formatters/link'

export function LinkJump() {
  const selection = inject(Selection)
  const query = inject(Query)
  const bridge = inject(SelectionBridge)
  const container = inject(VIEW_CONTAINER)

  const href = createSignal('')
  const ref = createRef<HTMLElement>()
  const isShow = createSignal(false)

  function onSelectionChange() {
    if (selection.isCollapsed) {
      const queryState = query.queryFormat(linkFormatter)
      if (queryState.state === QueryStateType.Enabled) {
        const rect = bridge.getRect({
          slot: selection.startSlot!,
          offset: selection.startOffset!
        })
        if (rect) {
          const offsetRect = container.getBoundingClientRect()
          Object.assign(ref.current!.style, {
            left: rect.left - offsetRect.left + 'px',
            top: rect.top - offsetRect.top + 'px'
          })
          isShow.set(true)
          let url = queryState.value!.href
          if (url.indexOf('://') < 0) {
            url = 'http://' + url
          }
          href.set(url)
          return
        }
      }
    }
    isShow.set(false)
  }

  selection.onChange.pipe(delay()).subscribe(() => {
    onSelectionChange()
  })

  function cleanLink() {
    isShow.set(false)
    const commonAncestorSlot = selection.commonAncestorSlot!
    const index = selection.focusOffset!
    const ranges = commonAncestorSlot.getFormatRangesByFormatter(linkFormatter, 0, commonAncestorSlot.length)
    ranges.forEach(range => {
      if (range.startIndex < index && range.endIndex >= index) {
        commonAncestorSlot.applyFormat(linkFormatter, {
          startIndex: range.startIndex,
          endIndex: range.endIndex,
          value: null
        })
      }
    })
  }

  return createPortal(
    withScopedCSS(css, () => {
      return (
        <div ref={ref} class="link-jump-plugin" style={{ display: isShow() ? '' : 'none' }}>
          <span onClick={cleanLink}>清除</span>
          <a target="_blank" href={href()}>跳转</a>
        </div>
      )
    }), container
  )
}
