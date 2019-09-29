import { AttrState, AttrTextField, FormItem } from './help';

export class FormTextField implements FormItem {
  host = document.createElement('div');
  name: string;
  private input: HTMLInputElement;

  constructor(private config: AttrTextField) {
    this.name = config.name;
    this.host.classList.add('tanbo-editor-form-group');
    this.host.innerHTML = `
    <div class="tanbo-editor-form-label">${config.label}</div>
    <div class="tanbo-editor-form-control-wrap">
      <input class="tanbo-editor-form-control" placeholder="${config.placeholder || ''}" type="text">
    </div>
    `;
    this.input = this.host.querySelector('input');
  }

  update(value: any): void {
    this.input.value = value;
  }

  getAttr(): AttrState {
    return {
      name: this.config.name,
      required: this.config.required,
      value: this.input.value
    }
  }
}
