import { AttrState, AttrTextField, FormItem } from './help';
import { Observable } from 'rxjs';

export class FormTextField implements FormItem {
  host = document.createElement('div');
  name: string;
  private input: HTMLInputElement;

  constructor(private config: AttrTextField,
              private delegate: (type: string) => Observable<string>) {
    this.name = config.name;
    this.host.classList.add('tanbo-editor-form-group');
    this.host.innerHTML = `
    <div class="tanbo-editor-form-label">${config.label}</div>
    <div class="tanbo-editor-form-control-wrap">
      <input class="tanbo-editor-form-control" placeholder="${config.placeholder || ''}" type="text">&nbsp;
      ${config.canUpload ?
      `<button type="button" class="tanbo-editor-form-btn" title="${config.uploadBtnText || '上传'}">
        <span class="tanbo-editor-icon-upload"></span>
       </button>`
      : ''
      }
    </div>`;
    this.input = this.host.querySelector('input');
    if (config.canUpload) {
      this.host.querySelector('button').addEventListener('click', () => {
        delegate(this.config.uploadType).subscribe(url => {
          this.update(url);
        });
      });
    }
  }

  update(value?: any): void {
    if (value === undefined) {
      this.input.value = '';
    } else {
      this.input.value = value;
    }
  }

  getAttr(): AttrState {
    return {
      name: this.config.name,
      required: this.config.required,
      value: this.input.value
    }
  }
}
