import { Subject } from 'rxjs';

import { Form } from '../forms/form';
import { AttrType } from '../forms/help';
import { DropdownConfig, HandlerType } from '../help';
import { BlockMatcher } from '../matcher/block.matcher';
import { TableTemplate } from '../../templates/table.template';
import { TableCommander } from '../commands/table.commander';

const commander = new TableCommander()

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

export const tableTool: DropdownConfig = {
  type: HandlerType.Dropdown,
  classes: ['tbus-icon-table'],
  tooltip: '表格',
  onHide: hideEvent.asObservable(),
  viewer: form,
  match: new BlockMatcher(TableTemplate),
  execCommand: commander
};
