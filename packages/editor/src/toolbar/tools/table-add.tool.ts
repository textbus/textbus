import { Commander, QueryState, QueryStateType, Selection, Slot } from '@textbus/core'
import { Injector } from '@tanbo/di'

import { DropdownTool, DropdownToolConfig } from '../toolkit/_api'
import { I18n } from '../../i18n'
import { Form, FormNumber, FormSwitch } from '../../uikit/forms/_api'
import { createCell, tableComponent } from '../../components/table.component'

export function tableAddToolConfigFactory(injector: Injector): DropdownToolConfig {
  const i18n = injector.get(I18n)
  const commander = injector.get(Commander)
  const selection = injector.get(Selection)
  const childI18n = i18n.getContext('plugins.toolbar.tableAddTool.view')
  const form = new Form({
    mini: true,
    confirmBtnText: childI18n.get('confirmBtnText'),
    items: [
      new FormNumber({
        name: 'rows',
        label: childI18n.get('rowLabel'),
        placeholder: childI18n.get('rowPlaceholder')
      }),
      new FormNumber({
        name: 'cols',
        label: childI18n.get('columnLabel'),
        placeholder: childI18n.get('columnPlaceholder')
      }),
      new FormSwitch({
        label: childI18n.get('useTextBusStyleLabel'),
        name: 'useTextBusStyle',
        checked: true
      })
    ]
  })

  const quickSelector = document.createElement('div')
  quickSelector.classList.add('textbus-toolbar-table-quick-selector')
  const map = new Map<HTMLElement, { row: number, col: number }>()
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      ((row: number, col: number) => {
        const cell = document.createElement('div')
        quickSelector.appendChild(cell)
        map.set(cell, {
          row,
          col
        })
      })(row, col)
    }
  }

  let flag = false
  quickSelector.addEventListener('mouseover', ev => {
    if (flag) {
      return
    }
    const srcElement = ev.target
    const config = map.get(srcElement as HTMLElement)
    if (config) {
      map.forEach((value, key) => {
        if (value.row <= config.row && value.col <= config.col) {
          key.classList.add('textbus-toolbar-table-quick-selector-selected')
        } else {
          key.classList.remove('textbus-toolbar-table-quick-selector-selected')
        }
      })
      form.update({
        cols: config.col + 1,
        rows: config.row + 1
      })
    }
  })

  quickSelector.addEventListener('mouseleave', () => {
    if (!flag) {
      Array.from(map.keys()).forEach(el => el.classList.remove('textbus-toolbar-table-quick-selector-selected'))
      form.update({})
    }
    flag = false
  })

  quickSelector.addEventListener('click', () => {
    flag = true
  })
  form.elementRef.insertBefore(quickSelector, form.elementRef.childNodes[0])
  return {
    iconClasses: ['textbus-icon-table'],
    tooltip: i18n.get('plugins.toolbar.tableAddTool.tooltip'),
    viewController: form,
    queryState(): QueryState<any> {
      return {
        state: QueryStateType.Normal,
        value: null
      }
    },
    useValue(value: any) {
      function create(rows: number, columns: number) {
        const result: Slot[] = []
        const size = rows * columns
        for (let i = 0; i < size; i++) {
          result.push(createCell())
        }
        return result
      }

      const component = tableComponent.createInstance(injector, {
        slots: create(value.rows || 4, value.cols || 6),
        state: {
          useTextBusStyle: value.useTextBusStyle,
          columnCount: value.cols || 6
        }
      })

      commander.insert(component)
      selection.setLocation(component.slots.get(0)!, 0)
    }
  }
}

export function tableAddTool() {
  return new DropdownTool(tableAddToolConfigFactory)
}
