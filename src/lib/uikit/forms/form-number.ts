import { Subscription } from 'rxjs';

import { AttrState, FormItem, FileUploader, FormNumberParams } from './help';

export class FormNumber implements FormItem<number> {
  elementRef = document.createElement('div');
  name: string;
  private input: HTMLInputElement;
  private sub: Subscription;
  private readonly btn: HTMLButtonElement;
  private readonly feedbackEle: HTMLElement;
  private uploader: FileUploader;

  constructor(private config: FormNumberParams) {
    this.name = config.name;
    this.elementRef.classList.add('textbus-form-group');
    this.elementRef.innerHTML = `
    <div class="textbus-control-label">${config.label}</div>
    <div class="textbus-control-value">
      <div class="textbus-input-group textbus-input-block">
        <input name="${config.name}" class="textbus-form-control textbus-input-block" placeholder="${config.placeholder || ''}" type="number" value="${config.value || ''}">
     </div>
     <div class="textbus-control-feedback-invalid"></div>
   </div>`;
    this.input = this.elementRef.querySelector('input');
    this.feedbackEle = this.elementRef.querySelector('.textbus-control-feedback-invalid');
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

  getAttr(): AttrState<number> {
    return {
      name: this.config.name,
      value: this.input.value as any as number
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
