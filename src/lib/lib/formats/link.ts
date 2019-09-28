import { Subject } from 'rxjs';

import { DropdownHandlerOption, HandlerType } from '../toolbar/help';
import { Form } from './common/form';
import { AttrState, AttrType } from './common/help';
import { AttrFormatter } from '../editor/fomatter/attr-formatter';

const form = new Form([{
  type: AttrType.TextField,
  label: '链接地址',
  name: 'href',
  required: true,
  placeholder: '请输入链接地址',
  validateErrorMessage: '请输入正确的链接地址',
  description: '设置点击后跳转的地址',
  validator: /http/
}]);
const updateEvent = new Subject<AttrState[]>();
const hideEvent = new Subject<void>();

form.onSubmit = function (attrs) {
  updateEvent.next(attrs);
  hideEvent.next();
};

export const linkHandler: DropdownHandlerOption = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-link'],
  tooltip: '链接',
  onHide: hideEvent.asObservable(),
  viewContents: form.host,
  execCommand: new AttrFormatter('a', updateEvent.asObservable())
};
