import { Form } from '../../uikit/forms/form';
import { FormType } from '../../uikit/forms/help';
import { AudioComponent, PreComponent } from '../../components/_api';
import { AudioCommander } from '../commands/audio.commander';
import { MediaMatcher } from '../matcher/media.matcher';
import { Toolkit } from '../toolkit/toolkit';

export const audioToolConfig = {
  iconClasses: ['textbus-icon-music'],
  tooltip: '音频',
  menuFactory() {
    return new Form({
      title: '音频设置',
      items: [{
        type: FormType.TextField,
        label: '音频链接地址',
        name: 'src',
        placeholder: '请输入链接地址',
        canUpload: true,
        uploadType: 'audio',
        uploadBtnText: '上传新音频',
        validateFn(value: string): string | null {
          if (!value) {
            return '必填项不能为空';
          }
          return null;
        }
      }, {
        type: FormType.Switch,
        label: '自动播放',
        checked: false,
        name: 'autoplay'
      }, {
        type: FormType.Hidden,
        name: 'controls',
        value: 'controls'
      }]
    });
  },
  matcher: new MediaMatcher(AudioComponent, 'audio', [PreComponent]),
  commanderFactory() {
    return new AudioCommander();
  }
}
export const audioTool = Toolkit.makeFormTool(audioToolConfig);
