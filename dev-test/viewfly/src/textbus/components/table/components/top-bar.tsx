import { withScopedCSS } from '@viewfly/scoped-css'
import { createSignal, inject, onMounted, onUnmounted, Signal } from '@viewfly/core'
import { fromEvent } from '@textbus/core'

import css from './top-bar.scoped.scss'
import { EditorService } from '../../../../services/editor.service'
import { TableComponent } from '../table.component'
import { ComponentToolbar } from '../../../../components/component-toolbar/component-toolbar'
import { ToolbarItem } from '../../../../components/toolbar-item/toolbar-item'
import { Button } from '../../../../components/button/button'
import { TableService } from '../table.service'
import { sum } from '../_utils'

export interface TopBarProps {
  isFocus: Signal<boolean>
  component: TableComponent
  layoutWidth: Signal<number[]>
}

export function TopBar(props: TopBarProps) {
  const editorService = inject(EditorService)
  const tableService = inject(TableService)
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

    let { startIndex, endIndex } = selectedColumnRange()!

    if (startIndex > endIndex) {
      [startIndex, endIndex] = [endIndex, startIndex]
    }
    props.component.selectColumn(startIndex, endIndex + 1)
  }

  let mouseDownFromToolbar = false

  onMounted(() => {
    const sub = fromEvent(document, 'click').subscribe(() => {
      if (mouseDownFromToolbar) {
        mouseDownFromToolbar = false
        return
      }
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

  // const instance = getCurrentInstance()
  const s = props.component.changeMarker.onChange.subscribe(() => {
    const currentLayout = props.component.state.columnsConfig.slice()
    if (currentLayout.join(',') !== props.layoutWidth().join(',')) {
      props.layoutWidth.set(currentLayout)
    }
    // instance.markAsDirtied()
  })
  onUnmounted(() => {
    s.unsubscribe()
  })

  return withScopedCSS(css, () => {
    const { state, tableSelection } = props.component

    const position = tableSelection()
    const range = selectedColumnRange()
    let left = 0
    if (range) {
      left = sum(props.component.state.columnsConfig.slice(0, Math.min(range.startIndex, range.endIndex)))
      left += sum(props.component.state.columnsConfig.slice(
        Math.min(range.startIndex, range.endIndex),
        Math.max(range.startIndex, range.endIndex) + 1)
      ) / 2
    }
    return (
      <div class={['top-bar', {
        active: props.isFocus()
      }]}>
        <div class="toolbar-wrapper">
          <div class="insert-bar">
            <ComponentToolbar
              style={{
                left: left - leftDistance() + 'px',
                display: selectedColumnRange() ? 'inline-block' : 'none',
              }}
              innerStyle={{
                transform: 'translateX(-50%)'
              }}
              visible={!!selectedColumnRange()}>
              <ToolbarItem>
                <Button onClick={() => {
                  props.component.deleteColumns()
                }}><span class="xnote-icon-bin"></span></Button>
              </ToolbarItem>
            </ComponentToolbar>
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
                    return <td onMousedown={ev => ev.preventDefault()} onClick={ev => {
                      mouseDownFromToolbar = true
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
