import { Subject } from 'rxjs';

import { Form } from '../forms/form';
import { AttrType } from '../forms/help';
import { DropdownConfig, HandlerType } from '../help';
import { MediaMatcher } from '../matcher/media.matcher';
import { ImageTemplate } from '../../templates/image.template';
import { ImageCommander } from '../commands/image.commander';

const commander = new ImageCommander()

const form = new Form([{
  type: AttrType.TextField,
  label: '图片链接地址',
  name: 'src',
  required: true,
  placeholder: '请输入链接地址',
  canUpload: true,
  uploadType: 'image',
  uploadBtnText: '上传新图片'
}]);
const hideEvent = new Subject<void>();

form.onSubmit = function (attrs) {
  commander.updateValue(attrs);
  hideEvent.next();
};

export const imageTool: DropdownConfig = {
  type: HandlerType.Dropdown,
  classes: ['tbus-icon-image'],
  tooltip: '图片',
  onHide: hideEvent.asObservable(),
  viewer: form,
  match: new MediaMatcher(ImageTemplate),
  execCommand: commander
};
