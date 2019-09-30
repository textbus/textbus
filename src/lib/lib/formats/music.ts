import { Subject } from 'rxjs';

import { DropdownHandlerOption, HandlerType } from '../toolbar/help';
import { Form } from './forms/form';
import { AttrState, AttrType } from './forms/help';
import { AttrFormatter } from '../edit-frame/fomatter/attr-formatter';

const form = new Form([{
  type: AttrType.TextField,
  label: '音频链接地址',
  name: 'src',
  required: true,
  placeholder: '请输入链接地址',
  canUpload: true,
  uploadType: 'audio',
  uploadBtnText: '上传新音频'
}, {
  type: AttrType.Switch,
  label: '自动播放',
  required: true,
  checked: false,
  name: 'autoplay'
}, {
  type: AttrType.Hidden,
  name: 'controls',
  value: 'controls'
}]);
const updateEvent = new Subject<AttrState[]>();
const hideEvent = new Subject<void>();

form.onSubmit = function (attrs) {
  updateEvent.next(attrs);
  hideEvent.next();
};

export const musicHandler: DropdownHandlerOption = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-music'],
  tooltip: '音频',
  onHide: hideEvent.asObservable(),
  viewer: form,
  match: {
    tags: ['audio']
  },
  execCommand: new AttrFormatter('audio', updateEvent.asObservable())
};
