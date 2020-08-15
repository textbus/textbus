import { ToolForm } from '../forms/tool-form';
import { AttrType } from '../forms/help';
import { TableCommander } from '../commands/table.commander';
import { Toolkit } from '../toolkit/toolkit';
import { PreComponent } from '../../components/pre.component';
import { TableMatcher } from '../matcher/table.matcher';
import { FormatAbstractData } from '../../core/format-abstract-data';

export const tableAddToolConfig = {
  iconClasses: ['textbus-icon-table'],
  tooltip: '表格',
  menuFactory() {
    const form = new ToolForm([{
      type: AttrType.TextField,
      required: true,
      name: 'rows',
      label: '表格行数',
      placeholder: '请输入表格行数'
    }, {
      type: AttrType.TextField,
      required: true,
      name: 'cols',
      label: '表格列数',
      placeholder: '请输入表格列数'
    }, {
      type: AttrType.Switch,
      label: '使用 TextBus 样式',
      required: false,
      name: 'useTextBusStyle',
      checked: true
    }]);

    const quickSelector = document.createElement('div');
    quickSelector.classList.add('textbus-table-quick-selector');
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
            key.classList.add('textbus-table-quick-selector-selected');
          } else {
            key.classList.remove('textbus-table-quick-selector-selected');
          }
        })
        form.update(new FormatAbstractData({
          attrs: {
            cols: config.col + 1,
            rows: config.row + 1
          }
        }))
      }
    })

    quickSelector.addEventListener('mouseleave', () => {
      if (flag === false) {
        Array.from(map.keys()).forEach(el => el.classList.remove('textbus-table-quick-selector-selected'));
        form.update(new FormatAbstractData({
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
export const tableAddTool = Toolkit.makeDropdownTool(tableAddToolConfig);
