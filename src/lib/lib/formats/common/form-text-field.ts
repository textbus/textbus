import { AttrState, AttrTextField, FormItem } from './help';

export class FormTextField implements FormItem {
  host = document.createElement('div');

  constructor(private config: AttrTextField) {
    this.host.classList.add('tanbo-editor-form-group');
    this.host.innerHTML = `
    <div class="tanbo-editor-form-label">${config.label}</div>
    <div><input class="tanbo-editor-form-control" name="${config.name}" placeholder="${config.placeholder || ''}" type="text"></div>
    <div class="tanbo-editor-form-description">${config.description || ''}</div>
    `;
  }

  getAttr(): AttrState {
    return {
      name: 'name',
      required: false,
      value: 'value'
    }
  }
}
