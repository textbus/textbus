import { Form } from '../forms/form';
import { AttrType } from '../forms/help';
import { VideoTemplate } from '../../templates/video.template';
import { VideoCommander } from '../commands/video.commander';
import { MediaMatcher } from '../matcher/media.matcher';
import { Toolkit } from '../toolkit/toolkit';

export const videoTool = Toolkit.makeDropdownTool({
  classes: ['tbus-icon-video'],
  tooltip: '视频',
  menuFactory() {
    return new Form([{
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
  },
  matcher: new MediaMatcher(VideoTemplate, 'video'),
  execCommand() {
    return new VideoCommander();
  }
});
