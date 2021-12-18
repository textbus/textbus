import { AttrState, FormItem, FormSelectParams } from './help'

export class FormSelect implements FormItem {
  elementRef = document.createElement('div');
  name: string;
  private select: HTMLSelectElement;
  private readonly feedbackEle: HTMLElement;

  constructor(private config: FormSelectParams) {
    this.name = config.name
    this.elementRef.classList.add('textbus-form-group')
    this.elementRef.innerHTML = `
    <div class="textbus-control-label">${config.label}</div>
    <div class="textbus-control-value">
       <select class="textbus-form-control" name="${config.name}">${
      config.options.map(option => {
        return `<option ${option.selected ? 'selected' : ''} value="${option.value}">${option.label}</option>`
      }).join('')
    }</select>
    </div>
    <div class="textbus-control-feedback-invalid"></div>`
    this.select = this.elementRef.querySelector('select')!
    this.feedbackEle = this.elementRef.querySelector('.textbus-control-feedback-invalid')!
  }

  reset() {
    let value: any = undefined
    this.config.options.forEach(option => {
      if (option.selected) {
        value = option.value
      }
    })
    this.update(value)
  }

  update(value?: any): void {
    this.config.options.forEach((option, index) => {
      this.select.options.item(index)!.selected = option.value === value
    })
  }

  getAttr(): AttrState<any> {
    return {
      name: this.config.name,
      value: this.select.value
    }
  }

  validate() {
    const feedback = this.config.validateFn?.(this.getAttr().value)
    this.feedbackEle.innerText = feedback || ''
    return !feedback
  }
}
