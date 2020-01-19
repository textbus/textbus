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
  viewer: form,
  editable: {
    tag: true
  },
  match: {
    noInTags: ['pre']
  },
  execCommand: commander
};
