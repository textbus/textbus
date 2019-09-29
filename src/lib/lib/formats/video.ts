import { Subject } from 'rxjs';

import { DropdownHandlerOption, HandlerType } from '../toolbar/help';
import { Form } from './forms/form';
import { AttrState, AttrType } from './forms/help';
import { AttrFormatter } from '../frame/fomatter/attr-formatter';

const form = new Form([{
  type: AttrType.TextField,
  label: '视频链接地址',
  name: 'src',
  required: true,
  placeholder: '请输入链接地址',
  canUpload: true,
  uploadType: 'video',
  uploadBtnText: '上传新视频'
}, {
  type: AttrType.Switch,
  label: '是否自动播放',
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

export const videoHandler: DropdownHandlerOption = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-video'],
  tooltip: '视频',
  onHide: hideEvent.asObservable(),
  viewer: form,
  execCommand: new AttrFormatter('video', updateEvent.asObservable())
};
