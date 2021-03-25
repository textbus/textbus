import { Injectable } from '@tanbo/di';
import { race } from 'rxjs';

import { Input } from '../input';
import { TBPlugin } from '../plugin';
import { UIDialog } from './dialog.plugin';
import { Form, FormTextField } from '../uikit/_api';

@Injectable()
export class PasteHandlePlugin implements TBPlugin {
  constructor(private input: Input,
              private dialog: UIDialog) {
  }

  setup() {
    this.input.addPasteMiddleware(dom => {
      const images = Array.from(dom.querySelectorAll('img'));
      const videos = Array.from(dom.querySelectorAll('video'));
      const audios = Array.from(dom.querySelectorAll('audio'));

      const sourceElements = [...images, ...videos, ...audios];
      if (sourceElements.length === 0) {
        return dom;
      }
      return new Promise(resolve => {
        const form = new Form({
          title: '资源上传',
          maxHeight: '260px',
          items: [
            ...images.map((img, index) => {
              return new FormTextField({
                name: 'index' + index,
                value: img.src,
                label: `第 ${index + 1} 张图片`,
                placeholder: '请输入图片地址',
                uploadBtnText: '上传',
                uploadType: img.tagName.toLowerCase(),
                canUpload: true,
              })
            }),
            ...videos.map((video, index) => {
              return new FormTextField({
                name: 'index' + index,
                value: video.src,
                label: `第 ${index + 1} 个视频`,
                placeholder: '请输入视频地址',
                uploadBtnText: '上传',
                uploadType: video.tagName.toLowerCase(),
                canUpload: true,
              })
            }),
            ...audios.map((audio, index) => {
              return new FormTextField({
                name: 'index' + index,
                value: audio.src,
                label: `第 ${index + 1} 个音频`,
                placeholder: '请输入音频地址',
                uploadBtnText: '上传',
                uploadType: audio.tagName.toLowerCase(),
                canUpload: true,
              })
            })
          ]
        })
        this.dialog.dialog(form.elementRef);

        const sub = race(form.onClose, form.onComplete).subscribe(result => {
          sub.unsubscribe();
          if (result) {
            images.forEach((img, index) => {
              img.src = result.get('index' + index);
            })
            videos.forEach((video, index) => {
              video.src = result.get('index' + index);
            })
            audios.forEach((audio, index) => {
              audio.src = result.get('index' + index);
            })
          }
          this.dialog.close();
          resolve(dom);
        })
      })
    })
  }
}
