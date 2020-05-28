import { Subject } from 'rxjs';

import { Form } from '../forms/form';
import { AttrType } from '../forms/help';
import { DropdownConfig, HandlerType } from '../help';
import { AudioTemplate } from '../../templates/audio.template';
import { AudioCommander } from '../commands/audio.commander';
import { MediaMatcher } from '../matcher/media.matcher';

const commander = new AudioCommander();

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
const hideEvent = new Subject<void>();

form.onSubmit = function (attrs) {
  commander.updateValue(attrs);
  hideEvent.next();
};

export const audioTool: DropdownConfig = {
  type: HandlerType.Dropdown,
  classes: ['tbus-icon-music'],
  tooltip: '音频',
  onHide: hideEvent.asObservable(),
  viewer: form,
  match: new MediaMatcher(AudioTemplate),
  execCommand: commander
};
