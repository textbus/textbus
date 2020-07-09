import { Form } from '../forms/form';
import { AttrType } from '../forms/help';
import { TableCommander } from '../commands/table.commander';
import { Toolkit } from '../toolkit/toolkit';

export const tableTool = Toolkit.makeDropdownTool({
  classes: ['tbus-icon-table'],
  tooltip: '表格',
  menuFactory() {
    return new Form([{
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
  },
  // match: new BlockMatcher(TableTemplate),
  commanderFactory() {
    return new TableCommander();
  }
});
