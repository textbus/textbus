import { ToolForm } from '../forms/tool-form';
import { AttrType } from '../forms/help';
import { AudioComponent, PreComponent } from '../../components/_api';
import { AudioCommander } from '../commands/audio.commander';
import { MediaMatcher } from '../matcher/media.matcher';
import { Toolkit } from '../toolkit/toolkit';

export const audioToolConfig = {
  iconClasses: ['textbus-icon-music'],
  tooltip: '音频',
  menuFactory() {
    return new ToolForm([{
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
  },
  matcher: new MediaMatcher(AudioComponent, 'audio', [PreComponent]),
  commanderFactory() {
    return new AudioCommander();
  }
}
export const audioTool = Toolkit.makeDropdownTool(audioToolConfig);
