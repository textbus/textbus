import { AttrSwitch, AttrState, FormItem } from './help';

export class FormSwitch implements FormItem {
  host = document.createElement('div');
  name: string;
  private input: HTMLInputElement;

  constructor(private config: AttrSwitch) {
    this.name = config.name;
    this.host.classList.add('tanbo-editor-form-group');
    this.host.innerHTML = `
    <div class="tanbo-editor-form-control-wrap">
      <label><input type="checkbox" ${config.checked ? 'checked="checked"' : ''}> ${config.label}</label>
    </div>
    `;
    this.input = this.host.querySelector('input');
  }

  update(value: any): void {
    this.input.checked = value;
  }

  getAttr(): AttrState {
    return {
      name: this.name,
      required: this.config.required,
      value: this.input.checked
    }
  }
}
