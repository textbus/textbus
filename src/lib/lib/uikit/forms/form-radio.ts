import { RadioGroup, AttrState, FormItem } from './help';

export class FormRadio implements FormItem {
  elementRef = document.createElement('div');
  name: string;
  private readonly inputs: HTMLInputElement[];
  private readonly feedbackEle: HTMLElement;

  constructor(private config: RadioGroup) {
    this.name = config.name;
    this.elementRef.classList.add('textbus-form-group');
    this.elementRef.innerHTML = `
    <div class="textbus-control-label">${config.label}</div>
    <div class="textbus-control-static">${
      config.values.map(c => {
        return `<label>
                  <input type="radio" ${c.default ? 'checked="checked"' : ''} name="${config.name}" value="${c.value}">
                  ${c.label}
                 </label>`;
      }).join('')
      }
    <div class="textbus-control-feedback-invalid"></div>
    </div>
    `;
    this.inputs = Array.from(this.elementRef.querySelectorAll('input'));
    this.feedbackEle = this.elementRef.querySelector('.textbus-control-feedback-invalid');
  }

  update(value?: any): void {
    const values = this.config.values;
    let isMatch = false;
    for (let i = 0; i < values.length; i++) {
      if (values[i].value === value) {
        this.inputs[i].checked = true;
        isMatch = true;
        break;
      }
    }
    if (!isMatch) {
      this.config.values.forEach((item, i) => {
        if (item.default) {
          this.inputs[i].checked = true;
        }
      })
    }
  }

  getAttr(): AttrState {
    const inputs = this.inputs;
    let value;
    for (let i = 0; i < inputs.length; i++) {
      if (inputs[i].checked) {
        value = this.config.values[i].value;
        break;
      }
    }
    return {
      name: this.config.name,
      value
    }
  }

  validate() {
    const feedback = this.config.validateFn?.(this.getAttr().value);
    this.feedbackEle.innerText = feedback || '';
    return !feedback;
  }
}
