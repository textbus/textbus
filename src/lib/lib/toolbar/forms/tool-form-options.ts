import { AttrOptions, AttrState, ToolFormItem } from './help';

export class ToolFormOptions implements ToolFormItem {
  elementRef = document.createElement('div');
  name: string;
  private readonly inputs: HTMLInputElement[];

  constructor(private config: AttrOptions) {
    this.name = config.name;
    this.elementRef.classList.add('textbus-toolbar-form-group');
    this.elementRef.innerHTML = `
    <div class="textbus-toolbar-control-label">${config.label}</div>
    <div class="textbus-toolbar-control-static">${
      config.values.map(c => {
        return `<label>
                  <input type="radio" ${c.default ? 'checked="checked"' : ''} name="${config.name}" value="${c.value}">
                  ${c.label}
                 </label>`;
      }).join('')
      }
    </div>
    `;
    this.inputs = Array.from(this.elementRef.querySelectorAll('input'));
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
      required: this.config.required,
      value
    }
  }
}
