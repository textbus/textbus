import { Subject } from 'rxjs';

import { Form } from './forms/form';
import { AttrState, AttrType } from './forms/help';
import { DropdownConfig, HandlerType } from '../help';
import { AttrCommander } from '../../commands/attr-commander';

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
const updateEvent = new Subject<AttrState[]>();
const hideEvent = new Subject<void>();

form.onSubmit = function (attrs) {
  updateEvent.next(attrs);
  hideEvent.next();
};

export const linkHandler: DropdownConfig = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-link'],
  tooltip: '链接',
  onHide: hideEvent.asObservable(),
  viewer: form,
  match: {
    tags: ['a']
  },
  execCommand: new AttrCommander('a', updateEvent.asObservable(), true)
};
