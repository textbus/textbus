import { AttrSwitch, AttrState, FormItem } from './help';

export class FormSwitch implements FormItem {
  elementRef = document.createElement('div');
  name: string;
  private input: HTMLInputElement;

  constructor(private config: AttrSwitch) {
    this.name = config.name;
    this.elementRef.classList.add('tanbo-editor-form-group');
    this.elementRef.innerHTML = `
    <div class="tanbo-editor-form-control-wrap">
      <label><input type="checkbox" ${config.checked ? 'checked="checked"' : ''}> ${config.label}</label>
    </div>
    `;
    this.input = this.elementRef.querySelector('input');
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
      required: this.config.required,
      value: this.input.checked
    }
  }
}
