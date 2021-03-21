import { Form, FormHidden, FormSwitch, FormTextField } from '../../uikit/forms/_api';
import { VideoComponent, PreComponent } from '../../../components/_api';
import { VideoCommander } from '../commands/video.commander';
import { MediaMatcher } from '../matcher/media.matcher';
import { FormToolConfig, Toolkit } from '../toolkit/_api';

export const videoToolConfig: FormToolConfig = {
  iconClasses: ['textbus-icon-video'],
  tooltip: '视频',
  menuFactory() {
    return new Form({
      title: '视频设置',
      items: [
        new FormTextField({
          label: '视频链接地址',
          name: 'src',
          placeholder: '请输入链接地址',
          canUpload: true,
          uploadType: 'video',
          uploadBtnText: '上传新视频',
          validateFn(value: string): string | null {
            if (!value) {
              return '必填项不能为空';
            }
            return null;
          }
        }),
        new FormHidden({
          name: 'controls',
          value: 'controls'
        }),
        new FormTextField({
          label: '视频宽度',
          name: 'width',
          placeholder: '支持任意 CSS 单位',
          value: '100%'
        }),
        new FormTextField({
          label: '视频高度',
          name: 'height',
          placeholder: '支持任意 CSS 单位',
          value: 'auto'
        }),
        new FormSwitch({
          label: '自动播放',
          checked: false,
          name: 'autoplay'
        })
      ]
    });
  },
  matcher: new MediaMatcher(VideoComponent, 'video', [PreComponent]),
  commanderFactory() {
    return new VideoCommander();
  }
};
export const videoTool = Toolkit.makeFormTool(videoToolConfig);
