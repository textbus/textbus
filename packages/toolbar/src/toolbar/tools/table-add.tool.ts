import { FormatData } from '@textbus/core';
import { PreComponent } from '@textbus/components';
import { Form, FormSwitch, FormTextField } from '@textbus/uikit';

import { TableCommander } from '../commands/table.commander';
import { DropdownTool, DropdownToolConfig } from '../toolkit/_api';
import { TableMatcher } from '../matcher/table.matcher';

export const tableAddToolConfig: DropdownToolConfig = {
  iconClasses: ['textbus-icon-table'],
  tooltip: i18n => i18n.get('plugins.toolbar.tableAddTool.tooltip'),
  viewFactory(i18n) {
    const childI18n = i18n.getContext('plugins.toolbar.tableAddTool.view');
    const form = new Form({
      mini: true,
      confirmBtnText: childI18n.get('confirmBtnText'),
      items: [
        new FormTextField({
          name: 'rows',
          label: childI18n.get('rowLabel'),
          placeholder: childI18n.get('rowPlaceholder')
        }),
        new FormTextField({
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
    });

    const quickSelector = document.createElement('div');
    quickSelector.classList.add('textbus-toolbar-table-quick-selector');
    const map = new Map<HTMLElement, { row: number, col: number }>();
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        ((row: number, col: number) => {
          const cell = document.createElement('div');
          quickSelector.appendChild(cell);
          map.set(cell, {
            row,
            col
          })
        })(row, col)
      }
    }

    let flag = false;
    quickSelector.addEventListener('mouseover', ev => {
      if (flag) {
        return;
      }
      const srcElement = ev.target;
      const config = map.get(srcElement as HTMLElement);
      if (config) {
        map.forEach((value, key) => {
          if (value.row <= config.row && value.col <= config.col) {
            key.classList.add('textbus-toolbar-table-quick-selector-selected');
          } else {
            key.classList.remove('textbus-toolbar-table-quick-selector-selected');
          }
        })
        form.update(new FormatData({
          attrs: {
            cols: config.col + 1,
            rows: config.row + 1
          }
        }))
      }
    })

    quickSelector.addEventListener('mouseleave', () => {
      if (flag === false) {
        Array.from(map.keys()).forEach(el => el.classList.remove('textbus-toolbar-table-quick-selector-selected'));
        form.update(new FormatData({
          attrs: null
        }))
      }
      flag = false;
    })

    quickSelector.addEventListener('click', () => {
      flag = true;
    })
    form.elementRef.insertBefore(quickSelector, form.elementRef.childNodes[0]);
    return form;
  },
  matcher: new TableMatcher([PreComponent]),
  commanderFactory() {
    return new TableCommander();
  }
}
export const tableAddTool = new DropdownTool(tableAddToolConfig);
