import { AttrSwitch, AttrState, ToolFormItem } from './help';

export class ToolFormSwitch implements ToolFormItem {
  elementRef = document.createElement('div');
  name: string;
  private input: HTMLInputElement;

  constructor(private config: AttrSwitch) {
    this.name = config.name;
    this.elementRef.classList.add('textbus-form-group');
    this.elementRef.innerHTML = `
    <div class="textbus-control-static">
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
