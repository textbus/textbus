import { FormSwitchParams, AttrState, FormItem } from './help'

export class FormSwitch implements FormItem<boolean> {
  elementRef = document.createElement('div');
  name: string;
  private input: HTMLInputElement;
  private readonly feedbackEle: HTMLElement;

  constructor(private config: FormSwitchParams) {
    this.name = config.name
    this.elementRef.classList.add('textbus-form-group')
    this.elementRef.innerHTML = `
    <div class="textbus-control-label"></div>
    <div class="textbus-control-static">
      <label><input name="${config.name}" type="checkbox" ${config.checked ? 'checked="checked"' : ''}> ${config.label}</label>
      <div class="textbus-control-feedback-invalid"></div>
    </div>
    `
    this.input = this.elementRef.querySelector('input')!
    this.feedbackEle = this.elementRef.querySelector('.textbus-control-feedback-invalid')!
  }

  reset() {
    this.input.checked = this.config.checked
  }

  update(value?: any): void {
    this.input.checked = typeof value === 'boolean' ? value : this.config.checked
  }

  getAttr(): AttrState<boolean> {
    return {
      name: this.name,
      value: this.input.checked
    }
  }

  validate() {
    const feedback = this.config.validateFn?.(this.getAttr().value)
    this.feedbackEle.innerText = feedback || ''
    return !feedback
  }
}
