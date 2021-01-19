import { AttrState, FormItem, FormNumberParams } from './help';

export class FormNumber implements FormItem<number> {
  elementRef = document.createElement('div');
  name: string;
  private input: HTMLInputElement;
  private readonly feedbackEle: HTMLElement;

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

  reset() {
    this.input.value = this.config.value as any;
  }

  update(value?: any): void {
    if ([undefined, null].includes(value)) {
      this.input.value = this.config.value as any;
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
}
