import { Subject } from 'rxjs';

import { Form } from './forms/form';
import { AttrType } from './forms/help';
import { DropdownConfig, HandlerType, Priority } from '../help';
import { TableCommander } from '../../commands/table-commander';

const commander = new TableCommander();

const form = new Form([{
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
  label: '添加表头',
  required: true,
  checked: false,
  name: 'header'
}]);

const hideEvent = new Subject<void>();

form.onSubmit = function (attrs) {
  commander.updateValue(attrs);
  hideEvent.next();
};

export const tableHandler: DropdownConfig = {
  type: HandlerType.Dropdown,
  classes: ['tbus-icon-table'],
  priority: Priority.Block,
  tooltip: '表格',
  onHide: hideEvent.asObservable(),
  styleSheets: [`table{border-spacing:0;width:100%;min-width:100%;margin-bottom:1em;background-color:#fff}table>thead>tr>th,table>thead>tr>td{text-align:left;padding:8px 15px;border-bottom:1px solid #dddee1;background-color:#f8f8f9}table>tfoot>tr>th,table>tfoot>tr>td{background-color:#f1f2f3}table>tbody>tr>td,table>tfoot>tr>td{font-weight:400;padding:8px 15px;border-bottom:1px solid #e9eaec}table>tbody>tr>th,table>tfoot>tr>th{font-weight:500;text-align:right;padding:8px 15px;border-bottom:1px solid #e9eaec}table>thead:first-child>tr:first-child,table>tbody:first-child>tr:first-child,table>tfoot:first-child>tr:first-child{border-top-left-radius:4px;border-top-right-radius:4px}table>thead:first-child>tr:first-child>td:first-child,table>thead:first-child>tr:first-child>th:first-child,table>tbody:first-child>tr:first-child>td:first-child,table>tbody:first-child>tr:first-child>th:first-child,table>tfoot:first-child>tr:first-child>td:first-child,table>tfoot:first-child>tr:first-child>th:first-child{border-top-left-radius:4px}table>thead:first-child>tr:first-child>td:last-child,table>thead:first-child>tr:first-child>th:last-child,table>tbody:first-child>tr:first-child>td:last-child,table>tbody:first-child>tr:first-child>th:last-child,table>tfoot:first-child>tr:first-child>td:last-child,table>tfoot:first-child>tr:first-child>th:last-child{border-top-right-radius:4px}table>thead:last-child>tr:last-child>td:first-child,table>thead:last-child>tr:last-child>th:first-child,table>tbody:last-child>tr:last-child>td:first-child,table>tbody:last-child>tr:last-child>th:first-child,table>tfoot:last-child>tr:last-child>td:first-child,table>tfoot:last-child>tr:last-child>th:first-child{border-bottom-left-radius:4px}table>thead:last-child>tr:last-child>td:last-child,table>thead:last-child>tr:last-child>th:last-child,table>tbody:last-child>tr:last-child>td:last-child,table>tbody:last-child>tr:last-child>th:last-child,table>tfoot:last-child>tr:last-child>td:last-child,table>tfoot:last-child>tr:last-child>th:last-child{border-bottom-right-radius:4px}table>thead:first-child>tr:first-child>th,table>thead:first-child>tr:first-child>td,table>tbody:first-child>tr:first-child>th,table>tbody:first-child>tr:first-child>td,table>tfoot:first-child>tr:first-child>th,table>tfoot:first-child>tr:first-child>td{border-top:1px solid #e9eaec}table>thead>tr>td,table>thead>tr>th,table>tbody>tr>td,table>tbody>tr>th,table>tfoot>tr>td,table>tfoot>tr>th{border-left:1px solid #e9eaec}table>thead>tr>td:last-child,table>thead>tr>th:last-child,table>tbody>tr>td:last-child,table>tbody>tr>th:last-child,table>tfoot>tr>td:last-child,table>tfoot>tr>th:last-child{border-right:1px solid #e9eaec}`],
  viewer: form,
  editable: {
    tag: true
  },
  match: {
    noInTags: ['pre']
  },
  execCommand: commander
};
