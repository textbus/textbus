import { AttrOptions, AttrTextField, AttrSwitch, FormItem, AttrType, AttrState } from './help';
import { FormTextField } from './form-text-field';
import { FormOptions } from './form-options';
import { FormSwitch } from './form-switch';

export class Form {
  onSubmit: (attrs: AttrState[]) => void;
  readonly host = document.createElement('form');
  private items: FormItem[] = [];

  constructor(forms: Array<AttrTextField | AttrOptions | AttrSwitch>) {
    this.host.classList.add('tanbo-editor-form');
    forms.forEach(attr => {
      switch (attr.type) {
        case AttrType.TextField:
          this.items.push(new FormTextField(attr));
          break;
        case AttrType.Options:
          this.items.push(new FormOptions(attr));
          break;
        case AttrType.Switch:
          this.items.push(new FormSwitch(attr));
          break;
      }
    });
    this.items.forEach(item => {
      this.host.appendChild(item.host);
    });

    this.host.setAttribute('novalidate', 'novalidate');

    const btnWrap = document.createElement('div');
    btnWrap.classList.add('tanbo-editor-form-btn-wrap');
    btnWrap.innerHTML = '<button class="tanbo-editor-form-submit" type="submit">确定</button>';

    this.host.appendChild(btnWrap);

    this.host.addEventListener('submit', (ev: Event) => {
      if (typeof this.onSubmit === 'function') {
        this.onSubmit(this.items.map(item => {
          return item.getAttr();
        }));
      }
      ev.preventDefault();
    });
  }
}
