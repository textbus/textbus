import { Observable } from 'rxjs';
import 'core-js';
import './textbus/assets/index.scss';


import {
  createEditor,
  fontSizeToolConfig,
  Form,
  FormHidden, FormRadio, FormSwitch,
  FormTextField,
  videoToolConfig
} from './textbus/public-api';

videoToolConfig.menuFactory = function () {
  return new Form({
    title: '视频设置',
    items: [
      new FormRadio({
        label: '本地/调用',
        name: 'local',
        values: [{
          label: '本地',
          value: true
        }, {
          label: '调用',
          value: false
        }]
      }),
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
}

const editor = createEditor('#editor', {
  expandComponentLibrary: true,
  deviceWidth: '768px',
  theme: 'dark',
  // fullScreen: true,
  uploader(type: string): string | Promise<string> | Observable<string> {
    const fileInput = document.createElement('input');
    fileInput.setAttribute('type', 'file');
    fileInput.setAttribute('accept', 'image/png, image/gif, image/jpeg, image/bmp, image/x-icon');
    fileInput.style.cssText = 'position: absolute; left: -9999px; top: -9999px; opacity: 0';
    document.body.appendChild(fileInput);
    fileInput.click();
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('/test')
      }, 3000)
    })
  },
  contents: document.getElementById('table').innerHTML
});

document.getElementById('btn').addEventListener('click', () => {
  editor.toolbar.tools.forEach(tool => {
    if (tool.config === fontSizeToolConfig) {
      editor.invoke(tool, '72px');
    }
  })
})


// editor.setContents(`<h1>textbus&nbsp;<span style="font-weight: normal;"><span style="letter-spacing: 5px;">富文本编</span></span><span style="letter-spacing: 5px;">辑器</span></h1>`);
