import { AttrOptions, AttrState, FormItem } from './help';

export class FormOptions implements FormItem {
  host = document.createElement('div');
  name: string;
  private readonly inputs: HTMLInputElement[];

  constructor(private config: AttrOptions) {
    this.name = config.name;
    this.host.classList.add('tanbo-editor-form-group');
    this.host.innerHTML = `
    <div class="tanbo-editor-form-label">${config.label}</div>
    <div class="tanbo-editor-form-control-wrap">${
      config.values.map(c => {
        return `<label>
                  <input type="radio" ${c.default ? 'checked="checked"' : ''} name="${config.name}" value="${c.value}">
                  ${c.label}
                 </label>`;
      }).join('')
      }
    </div>
    `;
    this.inputs = Array.from(this.host.querySelectorAll('input'));
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
