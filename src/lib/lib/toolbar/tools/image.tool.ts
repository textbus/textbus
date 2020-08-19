import { Form } from '../../uikit/forms/form';
import { FormType } from '../../uikit/forms/help';
import { MediaMatcher } from '../matcher/media.matcher';
import { ImageComponent, PreComponent } from '../../components/_api';
import { ImageCommander } from '../commands/image.commander';
import { Toolkit } from '../toolkit/toolkit';

export const imageToolConfig = {
  iconClasses: ['textbus-icon-image'],
  tooltip: '图片',
  menuFactory() {
    return new Form({
      title: '图片设置',
      items: [{
        type: FormType.TextField,
        label: '图片链接地址',
        name: 'src',
        placeholder: '请输入链接地址',
        canUpload: true,
        uploadType: 'image',
        uploadBtnText: '上传新图片',
        validateFn(value: string): string | null {
          if (!value) {
            return '必填项不能为空';
          }
          return null;
        }
      }, {
        type: FormType.TextField,
        label: '图片宽度',
        name: 'width',
        placeholder: '支持任意 CSS 单位',
        value: '100%'
      }, {
        type: FormType.TextField,
        label: '图片高度',
        name: 'height',
        placeholder: '支持任意 CSS 单位',
        value: 'auto'
      }]
    })
  },
  matcher: new MediaMatcher(ImageComponent, 'img', [PreComponent]),
  commanderFactory() {
    return new ImageCommander();
  }
};
export const imageTool = Toolkit.makeFormTool(imageToolConfig);
