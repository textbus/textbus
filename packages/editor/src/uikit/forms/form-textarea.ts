import { Subscription } from '@tanbo/stream'

import { AttrState, FormTextareaParams, FormItem } from './help'

export class FormTextarea implements FormItem<string> {
  elementRef = document.createElement('div');
  name: string;
  private input: HTMLTextAreaElement;
  private sub?: Subscription;
  private readonly btn?: HTMLButtonElement;
  private readonly feedbackEle: HTMLElement;

  constructor(private config: FormTextareaParams) {
    this.name = config.name
    this.elementRef.classList.add('textbus-form-group')
    this.elementRef.innerHTML = `
    <div class="textbus-control-label">${config.label}</div>
    <div class="textbus-control-value">
      <div class="textbus-input-group textbus-input-block">
        <textarea name="${config.name}" class="textbus-form-control textbus-input-block" placeholder="${config.placeholder || ''}">${config.value || ''}</textarea>
     </div>
     <div class="textbus-control-feedback-invalid"></div>
   </div>`
    this.input = this.elementRef.querySelector('textarea')!
    this.feedbackEle = this.elementRef.querySelector('.textbus-control-feedback-invalid')!
  }

  reset() {
    this.input.value = this.config.value as string
  }

  update(value?: any): void {
    this.uploaded()
    this.input.value = (value ?? this.config.value) || ''
  }

  getAttr(): AttrState<string> {
    return {
      name: this.config.name,
      value: this.input.value
    }
  }

  validate() {
    const feedback = this.config.validateFn?.(this.getAttr().value)
    this.feedbackEle.innerText = feedback || ''
    return !feedback
  }

  private uploaded() {
    if (this.sub) {
      this.sub.unsubscribe()
    }
    this.input.disabled = false
    if (this.btn) {
      this.btn.classList.remove('textbus-btn-loading')
      this.btn.children[0].className = 'textbus-icon-upload'
    }
  }
}
