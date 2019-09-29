import { Subject } from 'rxjs';

import { DropdownHandlerOption, HandlerType } from '../toolbar/help';
import { Form } from './forms/form';
import { AttrState, AttrType } from './forms/help';
import { AttrFormatter } from '../frame/fomatter/attr-formatter';

const form = new Form([{
  type: AttrType.TextField,
  label: '图片链接地址',
  name: 'src',
  required: true,
  placeholder: '请输入链接地址',
  canUpload: true,
  uploadType: 'video',
  uploadBtnText: '上传新图片'
}]);
const updateEvent = new Subject<AttrState[]>();
const hideEvent = new Subject<void>();

form.onSubmit = function (attrs) {
  updateEvent.next(attrs);
  hideEvent.next();
};

export const imageHandler: DropdownHandlerOption = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-image'],
  tooltip: '图片',
  onHide: hideEvent.asObservable(),
  viewer: form,
  execCommand: new AttrFormatter('img', updateEvent.asObservable())
};
