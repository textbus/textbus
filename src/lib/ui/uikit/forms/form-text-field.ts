import { Subscription } from 'rxjs';

import { AttrState, FormTextFieldParams, FormItem } from './help';
import { FileUploader } from '../../file-uploader';

export class FormTextField implements FormItem<string> {
  elementRef = document.createElement('div');
  name: string;
  private input: HTMLInputElement;
  private sub: Subscription;
  private readonly btn: HTMLButtonElement;
  private readonly feedbackEle: HTMLElement;
  private uploader: FileUploader;

  constructor(private config: FormTextFieldParams) {
    this.name = config.name;
    this.elementRef.classList.add('textbus-form-group');
    this.elementRef.innerHTML = `
    <div class="textbus-control-label">${config.label}</div>
    <div class="textbus-control-value">
      <div class="textbus-input-group textbus-input-block">
        <input name="${config.name}" class="textbus-form-control textbus-input-block" placeholder="${config.placeholder || ''}" type="text" value="${config.value || ''}">${config.canUpload ?
      `<button type="button" class="textbus-btn textbus-btn-dark" title="${config.uploadBtnText || ''}">
        <span class="textbus-icon-upload"></span>
       </button>`
      : ''
    }
     </div>
     <div class="textbus-control-feedback-invalid"></div>
   </div>`;
    this.input = this.elementRef.querySelector('input');
    this.feedbackEle = this.elementRef.querySelector('.textbus-control-feedback-invalid');
    if (config.canUpload) {
      this.btn = this.elementRef.querySelector('button');
      this.btn.addEventListener('click', () => {
        this.btn.classList.add('textbus-btn-loading');
        this.input.disabled = true;
        this.btn.children[0].className = 'textbus-icon-loading';
        if (this.sub) {
          this.sub.unsubscribe();
        }
        this.sub = this.uploader.upload(this.config.uploadType, this.input.value).subscribe({
          next: url => {
            this.update(url);
          },
          error: () => {
            this.uploaded();
          },
          complete: () => {
            this.uploaded();
          }
        });
      });
    }
  }

  useUploader(uploader: FileUploader) {
    this.uploader = uploader;
  }

  reset() {
    this.input.value = this.config.value;
  }

  update(value?: any): void {
    this.uploaded();
    if ([undefined, null].includes(value)) {
      this.input.value = this.config.value || '';
    } else {
      this.input.value = value;
    }
  }

  getAttr(): AttrState<string> {
    return {
      name: this.config.name,
      value: this.input.value
    }
  }

  validate() {
    const feedback = this.config.validateFn?.(this.getAttr().value);
    this.feedbackEle.innerText = feedback || '';
    return !feedback;
  }

  private uploaded() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
    this.input.disabled = false;
    if (this.btn) {
      this.btn.classList.remove('textbus-btn-loading');
      this.btn.children[0].className = 'textbus-icon-upload';
    }
  }
}
