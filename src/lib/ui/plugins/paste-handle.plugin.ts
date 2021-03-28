import { Injectable } from '@tanbo/di';
import { race } from 'rxjs';

import { Input } from '../input';
import { TBPlugin } from '../plugin';
import { UIDialog } from './dialog.plugin';
import { Form, FormTextField } from '../uikit/_api';
import { I18n } from '../../i18n';

@Injectable()
export class PasteHandlePlugin implements TBPlugin {
  constructor(private input: Input,
              private i18n: I18n,
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
          title: this.i18n.get('editor.pasteHandle.title'),
          maxHeight: '260px',
          confirmBtnText: this.i18n.get('editor.pasteHandle.confirmBtnText'),
          cancelBtnText: this.i18n.get('editor.pasteHandle.cancelBtnText'),
          items: [
            ...images.map((img, index) => {
              return new FormTextField({
                name: 'img' + index,
                value: img.src,
                label: this.i18n.joinTemplate(this.i18n.get('editor.pasteHandle.imageLabel'), index + 1),
                placeholder: this.i18n.get('editor.pasteHandle.imagePlaceholder'),
                uploadBtnText: this.i18n.get('editor.pasteHandle.uploadBtnText'),
                uploadType: img.tagName.toLowerCase(),
                canUpload: true,
              })
            }),
            ...videos.map((video, index) => {
              return new FormTextField({
                name: 'video' + index,
                value: video.src,
                label: this.i18n.joinTemplate(this.i18n.get('editor.pasteHandle.videoLabel'), index + 1),
                placeholder: this.i18n.get('editor.pasteHandle.videoPlaceholder'),
                uploadBtnText: this.i18n.get('editor.pasteHandle.uploadBtnText'),
                uploadType: video.tagName.toLowerCase(),
                canUpload: true,
              })
            }),
            ...audios.map((audio, index) => {
              return new FormTextField({
                name: 'audio' + index,
                value: audio.src,
                label: this.i18n.joinTemplate(this.i18n.get('editor.pasteHandle.videoLabel'), index + 1),
                placeholder: this.i18n.get('editor.pasteHandle.audioPlaceholder'),
                uploadBtnText: this.i18n.get('editor.pasteHandle.uploadBtnText'),
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
              img.src = result.get('img' + index);
            })
            videos.forEach((video, index) => {
              video.src = result.get('video' + index);
            })
            audios.forEach((audio, index) => {
              audio.src = result.get('audio' + index);
            })
          }
          this.dialog.close();
          resolve(dom);
        })
      })
    })
  }
}
