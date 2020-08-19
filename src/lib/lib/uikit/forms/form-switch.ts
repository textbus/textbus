import { Switch, AttrState, FormItem } from './help';

export class FormSwitch implements FormItem {
  elementRef = document.createElement('div');
  name: string;
  private input: HTMLInputElement;
  private readonly feedbackEle: HTMLElement;

  constructor(private config: Switch) {
    this.name = config.name;
    this.elementRef.classList.add('textbus-form-group');
    this.elementRef.innerHTML = `
    <div class="textbus-control-label"></div>
    <div class="textbus-control-static">
      <label><input type="checkbox" ${config.checked ? 'checked="checked"' : ''}> ${config.label}</label>
      <div class="textbus-control-feedback-invalid"></div>
    </div>
    `;
    this.input = this.elementRef.querySelector('input');
    this.feedbackEle = this.elementRef.querySelector('.textbus-control-feedback-invalid');
  }

  update(value?: any): void {
    if (value === undefined) {
      this.input.checked = this.config.checked;
    } else {
      this.input.checked = value;
    }
  }

  getAttr(): AttrState {
    return {
      name: this.name,
      value: this.input.checked
    }
  }

  validate() {
    const feedback = this.config.validateFn?.(this.getAttr().value);
    this.feedbackEle.innerText = feedback || '';
    return !feedback;
  }
}
