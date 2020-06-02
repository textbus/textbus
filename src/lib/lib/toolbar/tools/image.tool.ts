import { Form } from '../forms/form';
import { AttrType } from '../forms/help';
import { MediaMatcher } from '../matcher/media.matcher';
import { ImageTemplate } from '../../templates/image.template';
import { ImageCommander } from '../commands/image.commander';
import { Toolkit } from '../toolkit/toolkit';

export const imageTool = Toolkit.makeDropdownTool({
  classes: ['tbus-icon-image'],
  tooltip: '图片',
  menuFactory() {
    return new Form([{
      type: AttrType.TextField,
      label: '图片链接地址',
      name: 'src',
      required: true,
      placeholder: '请输入链接地址',
      canUpload: true,
      uploadType: 'image',
      uploadBtnText: '上传新图片'
    }])
  },
  match: new MediaMatcher(ImageTemplate),
  execCommand() {
    return new ImageCommander();
  }
});
