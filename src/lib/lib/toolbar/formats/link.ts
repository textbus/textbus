import { Subject } from 'rxjs';

import { Form } from './forms/form';
import { AttrType } from './forms/help';
import { DropdownConfig, HandlerType, Priority } from '../help';
import { LinkHook } from '../hooks/link-hook';
import { LinkCommander } from '../../commands/link-commander';

const commander = new LinkCommander();

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

export const linkHandler: DropdownConfig = {
  type: HandlerType.Dropdown,
  classes: ['tbus-icon-link'],
  priority: Priority.Inline,
  tooltip: '链接',
  onHide: hideEvent.asObservable(),
  editable: {
    attrs: ['href', 'target']
  },
  hook: new LinkHook(),
  viewer: form,
  match: {
    tags: ['a'],
    noInTags: ['pre']
  },
  execCommand: commander
};
