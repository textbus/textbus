import { AttrOptions, AttrState, FormItem } from './help';

export class FormOptions implements FormItem {
  host = document.createElement('div');

  constructor(private config: AttrOptions) {
    this.host.classList.add('tanbo-editor-form-group');
    this.host.innerHTML = `
    <div class="tanbo-editor-form-label">${config.label}</div>
    <div class="tanbo-editor-form-control-wrap">${
      config.values.map(c => {
        return `<label><input type="radio" ${c.default ? 'checked="checked"' : ''} name="${config.name}" value="${c.value}"> ${c.label}</label>`;
      }).join('')
      }
    </div>
    `;
  }

  getAttr(): AttrState {
    const inputs = this.host.querySelectorAll('input');
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
