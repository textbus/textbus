import { AttrState, FormItem, FormNumberParams } from './help'

export class FormNumber implements FormItem<number> {
  elementRef = document.createElement('div')
  name: string
  private input: HTMLInputElement
  private readonly feedbackEle: HTMLElement

  constructor(private config: FormNumberParams) {
    this.name = config.name
    this.elementRef.classList.add('textbus-form-group')
    this.elementRef.innerHTML = `
    <div class="textbus-control-label">${config.label}</div>
    <div class="textbus-control-value">
      <div class="textbus-input-group textbus-input-block">
        <input name="${config.name}" class="textbus-form-control textbus-input-block" placeholder="${
      config.placeholder || ''
    }" type="number" value="${config.value || ''}">
     </div>
     <div class="textbus-control-feedback-invalid"></div>
   </div>`
    this.input = this.elementRef.querySelector('input')!
    this.feedbackEle = this.elementRef.querySelector('.textbus-control-feedback-invalid')!
  }

  reset() {
    this.input.value = this.config.value as any || null
  }

  update(value?: any): void {
    this.input.value = (value ?? this.config.value) || ''
  }

  getAttr(): AttrState<number> {
    return {
      name: this.config.name,
      value: Number(this.input.value)
    }
  }

  validate() {
    const feedback = this.config.validateFn?.(this.getAttr().value)
    this.feedbackEle.innerText = feedback || ''
    return !feedback
  }
}
