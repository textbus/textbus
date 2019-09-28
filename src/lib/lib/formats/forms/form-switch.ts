import { AttrSwitch, AttrState, FormItem } from './help';

export class FormSwitch implements FormItem {
  host = document.createElement('div');

  constructor(private config: AttrSwitch) {
    this.host.classList.add('tanbo-editor-form-group');
    this.host.innerHTML = `
    <div class="tanbo-editor-form-control-wrap">
      <label><input type="checkbox" ${config.checked ? 'checked="checked"' : ''}> ${config.label}</label>
    </div>
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
