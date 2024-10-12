import { withScopedCSS } from '@viewfly/scoped-css'
import {
  createRef,
  createSignal,
  getCurrentInstance,
  inject, onMounted,
  onUnmounted,
  onUpdated,
  Signal,
  StaticRef
} from '@viewfly/core'
import { Slot, Selection, Textbus, fromEvent } from '@textbus/core'

import css from './left-bar.scoped.scss'
import { TableComponent } from '../table.component'
import { TableService } from '../table.service'
import { ToolbarItem } from '../../../../components/toolbar-item/toolbar-item'
import { Button } from '../../../../components/button/button'
import { ComponentToolbar } from '../../../../components/component-toolbar/component-toolbar'
import { EditorService } from '../../../../services/editor.service'

export interface TopBarProps {
  tableRef: StaticRef<HTMLTableElement>
  isFocus: Signal<boolean>
  component: TableComponent
}

export function LeftBar(props: TopBarProps) {
  const editorService = inject(EditorService)
  const selection = inject(Selection)
  const actionBarRef = createRef<HTMLTableElement>()
  const insertBarRef = createRef<HTMLTableElement>()
  const textbus = inject(Textbus)

  const tableService = inject(TableService)
  // 同步行高度
  onUpdated(() => {
    const insertBarRows = insertBarRef.current!.rows
    const actionBarRows = actionBarRef.current!.rows
    setTimeout(() => {
      Array.from(props.tableRef.current!.rows).forEach((tr, i) => {
        insertBarRows.item(i)!.style.height = tr.getBoundingClientRect().height + 'px'
        actionBarRows.item(i)!.style.height = tr.getBoundingClientRect().height + 'px'
      })
    })
  })
  const instance = getCurrentInstance()
  const s = props.component.changeMarker.onChange.subscribe(() => {
    instance.markAsDirtied()
  })

  onUnmounted(() => {
    s.unsubscribe()
  })

  let mouseDownFromToolbar = false
  onMounted(() => {
    const sub = fromEvent(document, 'click').subscribe(() => {
      if (mouseDownFromToolbar) {
        mouseDownFromToolbar = false
        return
      }
      deleteIndex.set(null)
      selectedRowRange.set(null)
    })
    return () => sub.unsubscribe()
  })

  const selectedRowRange = createSignal<null | { startIndex: number, endIndex: number }>(null)
  const deleteIndex = createSignal<null | number>(null)

  function selectRow(index: number, isMultiple: boolean) {
    editorService.hideInlineToolbar = true
    const currentSelectedColumnRange = selectedRowRange()
    if (isMultiple && currentSelectedColumnRange) {
      selectedRowRange.set({
        startIndex: currentSelectedColumnRange.startIndex,
        endIndex: index
      })

    } else {
      selectedRowRange.set({
        startIndex: index, endIndex: index
      })
    }

    const range = selectedRowRange()!
    const [startIndex, endIndex] = [range.startIndex, range.endIndex].sort((a, b) => a - b)

    const selectedSlots: Slot[] = []
    const rows = props.component.state.rows
    rows.slice(startIndex, endIndex + 1).forEach(row => {
      selectedSlots.push(...row.cells.map(i => i.slot))
    })
    textbus.nextTick(() => {
      selection.setSelectedRanges(selectedSlots.map(i => {
        return {
          slot: i,
          startIndex: 0,
          endIndex: i.length
        }
      }))
      selection.restore()
      textbus.focus()
    })
  }

  return withScopedCSS(css, () => {
    const { state, tableSelection } = props.component

    const position = tableSelection()
    return (
      <div class={['left-bar', { active: props.isFocus() }]}>
        <div class="insert-bar">
          <table ref={insertBarRef}>
            <tbody>
            {
              state.rows.map((_, index) => {
                return (
                  <tr>
                    <td>
                      <div class="toolbar-item">
                        {
                          index === 0 && (
                            <span onMouseenter={() => {
                              tableService.onInsertRowBefore.next(-1)
                            }} onMouseleave={() => {
                              tableService.onInsertRowBefore.next(null)
                            }} class="insert-btn-wrap" style={{
                              top: '-14px'
                            }} onClick={() => {
                              props.component.insertRow(0)
                            }}>
                              <button class="insert-btn" type="button">+</button>
                            </span>
                          )
                        }
                        <span onMouseenter={() => {
                          tableService.onInsertRowBefore.next(index)
                        }} onMouseleave={() => {
                          tableService.onInsertRowBefore.next(null)
                        }} class="insert-btn-wrap" onClick={() => {
                          props.component.insertRow(index + 1)
                        }}>
                          <button class="insert-btn" type="button">+</button>
                        </span>
                        <ComponentToolbar
                          style={{
                            display: deleteIndex() === index ? 'inline-block' : 'none',
                            left: '-35px'
                          }}
                          innerStyle={{
                            top: 0,
                            transform: 'translateY(-50%)'
                          }}
                          visible={deleteIndex() === index}>
                          <ToolbarItem>
                            <Button onClick={() => {
                              props.component.deleteRow(index)
                              deleteIndex.set(null)
                            }}><span class="xnote-icon-bin"></span></Button>
                          </ToolbarItem>
                        </ComponentToolbar>
                      </div>
                    </td>
                  </tr>
                )
              })
            }
            </tbody>
          </table>
        </div>
        <div class="action-bar">
          <table ref={actionBarRef}>
            <tbody>
            {
              props.component.state.rows.map((_, index) => {
                return <tr>
                  <td onMousedown={(ev) => {
                    mouseDownFromToolbar = true
                    if (!ev.shiftKey) {
                      deleteIndex.set(index)
                    } else {
                      deleteIndex.set(null)
                    }
                    selectRow(index, ev.shiftKey)
                  }} class={{
                    active: !position ? false :
                      (position.startColumn === 0 &&
                        position.endColumn === state.layoutWidth.length &&
                        index >= position.startRow && index < position.endRow
                      )
                  }}/>
                </tr>
              })
            }
            </tbody>
          </table>
        </div>
      </div>
    )
  })
}
