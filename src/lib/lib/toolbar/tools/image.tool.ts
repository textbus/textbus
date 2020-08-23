import { Form, FormRadio, FormTextField } from '../../uikit/forms/_api';
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
      items: [
        new FormTextField({
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
        }),
        new FormTextField({
          label: '图片宽度',
          name: 'width',
          placeholder: '支持任意 CSS 单位',
          value: '100%'
        }),
        new FormTextField({
          label: '图片高度',
          name: 'height',
          placeholder: '支持任意 CSS 单位',
          value: 'auto'
        }),
        // new FormRadio({
        //   label: '（可选）浮动',
        //   name: 'float',
        //   values: [{
        //     label: '左边',
        //     value: 'left'
        //   }, {
        //     label: '右边',
        //     value: 'right'
        //   }]
        // })
      ]
    })
  },
  matcher: new MediaMatcher(ImageComponent, 'img', [PreComponent]),
  commanderFactory() {
    return new ImageCommander();
  }
};
export const imageTool = Toolkit.makeFormTool(imageToolConfig);
