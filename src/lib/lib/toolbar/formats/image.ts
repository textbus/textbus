import { Subject } from 'rxjs';

import { Form } from './forms/form';
import { AttrType } from './forms/help';
import { DropdownConfig, HandlerType, Priority } from '../help';
import { sourceHook } from '../hooks/source-hook';
import { AttrCommander } from '../../commands/attr-commander';

const commander = new AttrCommander('img');

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

const hideEvent = new Subject<void>();

form.onSubmit = function aaa(attrs) {
  commander.updateValue(attrs);
  hideEvent.next();
};

export const imageHandler: DropdownConfig = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-image'],
  priority: Priority.Inline,
  tooltip: '图片',
  onHide: hideEvent.asObservable(),
  viewer: form,
  hook: sourceHook,
  editable: {
    attrs: ['src']
  },
  match: {
    tags: ['img'],
    noInTags: ['pre']
  },
  execCommand: commander
};
