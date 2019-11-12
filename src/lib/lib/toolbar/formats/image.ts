import { Subject } from 'rxjs';

import { Form } from './forms/form';
import { AttrState, AttrType } from './forms/help';
import { DropdownConfig, HandlerType, inlineHandlerPriority } from '../help';
import { sourceHook } from '../hooks/source-hook';
import { AttrCommander } from '../../commands/attr-commander';

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

export const imageHandler: DropdownConfig = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-image'],
  priority: inlineHandlerPriority,
  tooltip: '图片',
  onHide: hideEvent.asObservable(),
  viewer: form,
  hooks: sourceHook,
  match: {
    tags: ['img']
  },
  execCommand: new AttrCommander('img', updateEvent.asObservable())
};
