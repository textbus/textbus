import { Form } from '../../uikit/forms/form';
import { FormType } from '../../uikit/forms/help';
import { VideoComponent, PreComponent } from '../../components/_api';
import { VideoCommander } from '../commands/video.commander';
import { MediaMatcher } from '../matcher/media.matcher';
import { Toolkit } from '../toolkit/toolkit';

export const videoToolConfig = {
  iconClasses: ['textbus-icon-video'],
  tooltip: '视频',
  menuFactory() {
    return new Form({
      title: '视频设置',
      items: [{
        type: FormType.TextField,
        label: '视频链接地址',
        name: 'src',
        placeholder: '请输入链接地址',
        canUpload: true,
        uploadType: 'video',
        uploadBtnText: '上传新视频'
      }, {
        type: FormType.Hidden,
        name: 'controls',
        value: 'controls'
      }, {
        type: FormType.TextField,
        label: '视频宽度',
        name: 'width',
        placeholder: '支持任意 CSS 单位',
        value: '100%'
      }, {
        type: FormType.TextField,
        label: '视频高度',
        name: 'height',
        placeholder: '支持任意 CSS 单位',
        value: 'auto'
      }, {
        type: FormType.Switch,
        label: '自动播放',
        checked: false,
        name: 'autoplay'
      }]
    });
  },
  matcher: new MediaMatcher(VideoComponent, 'video', [PreComponent]),
  commanderFactory() {
    return new VideoCommander();
  }
};
export const videoTool = Toolkit.makeFormTool(videoToolConfig);
