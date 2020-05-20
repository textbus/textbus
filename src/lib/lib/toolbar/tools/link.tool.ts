import { Subject } from 'rxjs';

import { DropdownConfig, HandlerType } from '../help';
import { LinkCommander } from '../commands/link.commander';
import { Form } from '../forms/form';
import { AttrType } from '../forms/help';
import { FormatMatcher } from '../matcher/format.matcher';
import { linkFormatter } from '../../formatter/link.formatter';

const commander = new LinkCommander(linkFormatter);

const form = new Form([{
  type: AttrType.TextField,
  label: '跳转链接地址',
  name: 'href',
  required: true,
  placeholder: '请输入链接地址'
}, {
  type: AttrType.Options,
  label: '跳转方式',
  name: 'target',
  required: true,
  values: [{
    label: '当前窗口',
    value: '_self',
    default: true
  }, {
    label: '新窗口',
    value: '_blank'
  }]
}]);
const hideEvent = new Subject<void>();

form.onSubmit = function (attrs) {
  commander.updateValue(attrs);
  hideEvent.next();
};

export const linkTool: DropdownConfig = {
  type: HandlerType.Dropdown,
  classes: ['tbus-icon-link'],
  tooltip: '链接',
  onHide: hideEvent.asObservable(),
  viewer: form,
  match: new FormatMatcher(linkFormatter),
  execCommand: commander
};
