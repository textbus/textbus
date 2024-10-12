import { withScopedCSS } from '@viewfly/scoped-css'
import { createSignal, getCurrentInstance, inject, onMounted, onUnmounted, Signal } from '@viewfly/core'
import { Slot, Selection, Textbus, fromEvent } from '@textbus/core'

import css from './top-bar.scoped.scss'
import { EditorService } from '../../../../services/editor.service'
import { TableComponent } from '../table.component'
import { ComponentToolbar } from '../../../../components/component-toolbar/component-toolbar'
import { ToolbarItem } from '../../../../components/toolbar-item/toolbar-item'
import { Button } from '../../../../components/button/button'
import { TableService } from '../table.service'

export interface TopBarProps {
  isFocus: Signal<boolean>
  component: TableComponent
  layoutWidth: Signal<number[]>
}

export function TopBar(props: TopBarProps) {
  const editorService = inject(EditorService)
  const selection = inject(Selection)
  const tableService = inject(TableService)
  const textbus = inject(Textbus)
  const selectedColumnRange = createSignal<null | { startIndex: number, endIndex: number }>(null)

  function selectColumn(index: number, isMultiple: boolean) {
    editorService.hideInlineToolbar = true
    const currentSelectedColumnRange = selectedColumnRange()
    if (isMultiple && currentSelectedColumnRange) {
      selectedColumnRange.set({
        startIndex: currentSelectedColumnRange.startIndex,
        endIndex: index
      })

    } else {
      selectedColumnRange.set({
        startIndex: index, endIndex: index
      })
    }

    const range = selectedColumnRange()!
    const [startIndex, endIndex] = [range.startIndex, range.endIndex].sort((a, b) => a - b)

    const selectedSlots: Slot[] = []
    const rows = props.component.state.rows
    rows.forEach(row => {
      selectedSlots.push(...row.cells.slice(startIndex, endIndex + 1).map(i => i.slot))
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

  let mouseDownFromToolbar = false

  onMounted(() => {
    const sub = fromEvent(document, 'click').subscribe(() => {
      if (mouseDownFromToolbar) {
        mouseDownFromToolbar = false
        return
      }
      deleteIndex.set(null)
      selectedColumnRange.set(null)
    })
    return () => sub.unsubscribe()
  })

  const leftDistance = createSignal(0)

  onMounted(() => {
    const sub = tableService.onScroll.subscribe(n => {
      leftDistance.set(n)
    })

    return () => sub.unsubscribe()
  })

  const instance = getCurrentInstance()
  const s = props.component.changeMarker.onChange.subscribe(() => {
    instance.markAsDirtied()
  })
  onUnmounted(() => {
    s.unsubscribe()
  })
  const deleteIndex = createSignal<null | number>(null)

  return withScopedCSS(css, () => {
    const { state, tableSelection } = props.component

    const position = tableSelection()
    return (
      <div class={['top-bar', {
        active: props.isFocus()
      }]}>
        <div class="toolbar-wrapper">
          <div class="insert-bar">
            <table style={{
              transform: `translateX(${-leftDistance()}px)`
            }}>
              <tbody>
              <tr>
                {
                  props.layoutWidth().map((i, index) => {
                    return (
                      <td style={{ width: i + 'px', minWidth: i + 'px' }}>
                        <div class="tool-container">
                          {
                            index === 0 && (
                              <span onMouseenter={() => {
                                tableService.onInsertColumnBefore.next(0)
                              }} onMouseleave={() => {
                                tableService.onInsertColumnBefore.next(null)
                              }} class="insert-btn-wrap" style={{
                                left: '-10px'
                              }} onClick={() => {
                                props.component.insertColumn(0)
                              }}>
                              <button class="insert-btn" type="button">+</button>
                            </span>
                            )
                          }
                          <span class="insert-btn-wrap" onMouseenter={() => {
                            tableService.onInsertColumnBefore.next(index + 1)
                          }} onMouseleave={() => {
                            tableService.onInsertColumnBefore.next(null)
                          }} onClick={() => {
                            props.component.insertColumn(index + 1)
                          }}>
                            <button class="insert-btn" type="button">+</button>
                          </span>
                          <ComponentToolbar
                            style={{
                              display: deleteIndex() === index ? 'inline-block' : 'none',
                              left: '50%',
                            }}
                            innerStyle={{
                              transform: 'translateX(-50%)'
                            }}
                            visible={deleteIndex() === index}>
                            <ToolbarItem>
                              <Button onClick={() => {
                                props.component.deleteColumn(index)
                                deleteIndex.set(null)
                              }}><span class="xnote-icon-bin"></span></Button>
                            </ToolbarItem>
                          </ComponentToolbar>
                        </div>
                      </td>
                    )
                  })
                }
              </tr>
              </tbody>
            </table>
          </div>
          <div class={['action-bar', { active: props.isFocus() }]}>
            <table style={{
              transform: `translateX(${-leftDistance()}px)`
            }}>
              <tbody>
              <tr>
                {
                  props.layoutWidth().map((i, index) => {
                    return <td onClick={ev => {
                      mouseDownFromToolbar = true
                      if (!ev.shiftKey) {
                        deleteIndex.set(index)
                      } else {
                        deleteIndex.set(null)
                      }
                      selectColumn(index, ev.shiftKey)
                    }} class={{
                      active: !position ? false :
                        (position.startRow === 0 &&
                          position.endRow === state.rows.length &&
                          index >= position.startColumn && index < position.endColumn
                        )
                    }} style={{ width: i + 'px', minWidth: i + 'px' }}/>
                  })
                }
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  })
}
