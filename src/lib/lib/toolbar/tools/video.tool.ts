import { Subject } from 'rxjs';

import { Form } from '../forms/form';
import { AttrType } from '../forms/help';
import { DropdownConfig, HandlerType } from '../help';
import { VideoTemplate } from '../../templates/video.template';
import { VideoCommander } from '../commands/video.commander';
import { MediaMatcher } from '../matcher/media.matcher';

const commander = new VideoCommander()

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

export const videoTool: DropdownConfig = {
  type: HandlerType.Dropdown,
  classes: ['tbus-icon-video'],
  tooltip: '视频',
  onHide: hideEvent.asObservable(),
  viewer: form,
  match: new MediaMatcher(VideoTemplate),
  execCommand: commander
};
