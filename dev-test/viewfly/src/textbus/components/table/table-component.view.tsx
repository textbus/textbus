import { ContentType, createVNode, Slot, Textbus } from '@textbus/core'
import { ViewComponentProps } from '@textbus/adapter-viewfly'
import { ComponentLoader, DomAdapter, SlotParser } from '@textbus/platform-browser'
import { createRef, createSignal, inject, onUnmounted, withAnnotation } from '@viewfly/core'

import './table.component.scss'
import { TableCellConfig, TableComponent } from './table.component'
import { ResizeColumn } from './components/resize-column'
import { TopBar } from './components/top-bar'
import { Scroll } from './components/scroll'
import { LeftBar } from './components/left-bar'
import { TableService } from './table.service'
import { ResizeRow } from './components/resize-row'
import { SelectionMask } from './components/selection-mask'
import { deltaToBlock } from '../paragraph/paragraph.component'
import { useReadonly } from '../../hooks/use-readonly'
import { useOutput } from '../../hooks/use-output'
import { EditorService } from '../../../services/editor.service'
// import { SlotRender } from '../SlotRender'

export const TableComponentView = withAnnotation({
  providers: [TableService]
}, function TableComponentView(props: ViewComponentProps<TableComponent>) {
  const adapter = inject(DomAdapter)
  const editorService = inject(EditorService)
  const isFocus = createSignal(false)
  const layoutWidth = createSignal(props.component.state.layoutWidth)
  const subscription = props.component.focus.subscribe(b => {
    isFocus.set(b)
    if (!b) {
      editorService.hideInlineToolbar = false
    }
  })

  onUnmounted(() => {
    subscription.unsubscribe()
  })

  const tableRef = createRef<HTMLTableElement>()

  const isResizeColumn = createSignal(false)

  const rowMapping = new WeakMap<object, number>()

  const readonly = useReadonly()
  const output = useOutput()
  return () => {
    const state = props.component.state
    const rows = state.rows

    rows.forEach(row => {
      if (rowMapping.has(row)) {
        return
      }
      rowMapping.set(row, Math.random())
    })

    if (readonly() || output()) {
      return (
        <div class="xnote-table" data-component={props.component.name} data-layout-width={state.layoutWidth}>
          <div class="xnote-table-inner" ref={props.rootRef}>
            <div class="xnote-table-container">
              <table class={[
                'xnote-table-content',
                {
                  'hide-selection': props.component.tableSelection()
                }
              ]}>
                <colgroup>
                  {
                    layoutWidth().map(w => {
                      return <col style={{ width: w + 'px', minWidth: w + 'px' }}/>
                    })
                  }
                </colgroup>
                <tbody>
                {
                  rows.map((row) => {
                    return (
                      <tr key={rowMapping.get(row)}>
                        {
                          row.cells.map(cell => {
                            return adapter.slotRender(cell.slot, children => {
                              return createVNode('td', {
                                key: cell.slot.id
                              }, children)
                            }, readonly() || output())
                          })
                        }
                      </tr>
                    )
                  })
                }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div class="xnote-table" data-component={props.component.name} data-layout-width={`[${state.layoutWidth.join(',')}]`}>
        <div class="xnote-table-inner" ref={props.rootRef}>
          <TopBar
            isFocus={isFocus}
            layoutWidth={layoutWidth}
            component={props.component}
          />
          <LeftBar
            tableRef={tableRef}
            isFocus={isFocus}
            component={props.component}/>
          <Scroll isFocus={isFocus}>
            <div class="xnote-table-container">
              <table ref={tableRef} class={[
                'xnote-table-content',
                {
                  'hide-selection': props.component.tableSelection()
                }
              ]}>
                <colgroup>
                  {
                    layoutWidth().map(w => {
                      return <col style={{ width: w + 'px', minWidth: w + 'px' }}/>
                    })
                  }
                </colgroup>
                <tbody>
                {
                  rows.map((row) => {
                    return (
                      <tr key={rowMapping.get(row)}>
                        {
                          row.cells.map(cell => {
                            return adapter.slotRender(cell.slot, children => {
                              return createVNode('td', {
                                key: cell.slot.id
                              }, children)
                            }, readonly() || output())
                          })
                        }
                      </tr>
                    )
                  })
                }
                </tbody>
              </table>
              <ResizeColumn
                tableRef={tableRef}
                component={props.component}
                layoutWidth={layoutWidth}
                onActiveStateChange={isActive => {
                  isResizeColumn.set(isActive)
                }}/>
              <SelectionMask tableRef={tableRef} component={props.component}/>
            </div>
          </Scroll>
          <ResizeRow component={props.component} tableRef={tableRef}/>
        </div>
      </div>
    )
  }
})

export const tableComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return element.dataset.component === TableComponent.componentName || element.tagName === 'TABLE'
  },
  read(element: HTMLElement, textbus: Textbus, slotParser: SlotParser): TableComponent | Slot | void {
    let content: HTMLElement = element
    if (element.tagName === 'DIV') {
      content = element.querySelector('.xnote-table-content') as HTMLTableElement
    }
    const { tHead, tBodies, tFoot } = content as HTMLTableElement
    const headers: TableCellConfig[][] = []
    const bodies: TableCellConfig[][] = []
    if (tHead) {
      Array.from(tHead.rows).forEach(row => {
        const arr: TableCellConfig[] = []
        headers.push(arr)
        Array.from(row.cells).forEach(cell => {
          const slot = new Slot([
            ContentType.BlockComponent,
          ])
          arr.push({
            slot,
            rowspan: cell.rowSpan,
            colspan: cell.colSpan
          })
          const delta = slotParser(new Slot([
            ContentType.BlockComponent,
            ContentType.InlineComponent,
            ContentType.Text
          ]), cell).toDelta()

          const results = deltaToBlock(delta, textbus)
          results.forEach(i => {
            slot.insert(i)
          })
        })
      })
    }

    if (tBodies) {
      Array.of(...Array.from(tBodies), tFoot || { rows: [] }).reduce((value, next) => {
        return value.concat(Array.from(next.rows))
      }, [] as HTMLTableRowElement[]).forEach((row: HTMLTableRowElement) => {
        const arr: TableCellConfig[] = []
        bodies.push(arr)
        Array.from(row.cells).forEach(cell => {
          const slot = new Slot([
            ContentType.BlockComponent,
          ])
          arr.push({
            slot,
            rowspan: cell.rowSpan,
            colspan: cell.colSpan
          })
          const delta = slotParser(new Slot([
            ContentType.BlockComponent,
            ContentType.InlineComponent,
            ContentType.Text
          ]), cell).toDelta()

          const results = deltaToBlock(delta, textbus)
          results.forEach(i => {
            slot.insert(i)
          })
        })
      })
    }
    bodies.unshift(...headers)

    const cells = autoComplete(bodies)

    let layoutWidth: number[] | null = null

    try {
      const columnWidth = JSON.parse(element.dataset.layoutWidth || '')
      if (Array.isArray(columnWidth)) {
        layoutWidth = columnWidth
      }
    } catch (e) {
      //
    }

    if (!layoutWidth) {
      layoutWidth = Array.from<number>({ length: cells[0].length }).fill(100)
    }


    return new TableComponent(textbus, {
      rows: cells.map(i => {
        return {
          height: 30,
          cells: i
        }
      }),
      layoutWidth
    })
  }
}


export function autoComplete(table: TableCellConfig[][]) {
  const newTable: TableCellConfig[][] = []

  table.forEach((tr, rowIndex) => {
    if (!newTable[rowIndex]) {
      newTable[rowIndex] = []
    }
    const row = newTable[rowIndex]

    let startColumnIndex = 0

    tr.forEach(td => {
      while (row[startColumnIndex]) {
        startColumnIndex++
      }

      let maxColspan = 1

      while (maxColspan < td.colspan) {
        if (!row[startColumnIndex + maxColspan]) {
          maxColspan++
        } else {
          break
        }
      }

      td.colspan = maxColspan

      for (let i = rowIndex, len = td.rowspan + rowIndex; i < len; i++) {
        if (!newTable[i]) {
          newTable[i] = []
        }
        const row = newTable[i]

        for (let j = startColumnIndex, max = startColumnIndex + maxColspan; j < max; j++) {
          row[j] = td
        }
      }

      startColumnIndex += maxColspan
    })
  })

  const maxColumns = Math.max(...newTable.map(i => i.length))
  newTable.forEach(tr => {
    for (let i = 0; i < maxColumns; i++) {
      if (!tr[i]) {
        tr[i] = {
          rowspan: 1,
          colspan: 1,
          slot: new Slot([
            ContentType.BlockComponent
          ])
        }
      }
    }
  })

  const recordCells: TableCellConfig[] = []

  return newTable.map(tr => {
    return tr.filter(td => {
      const is = recordCells.includes(td)
      if (is) {
        return false
      }
      recordCells.push(td)
      return true
    })
  })
}
