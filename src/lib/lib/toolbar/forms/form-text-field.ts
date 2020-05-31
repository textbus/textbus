import { Observable, Subscription } from 'rxjs';

import { AttrState, AttrTextField, FormItem } from './help';

export class FormTextField implements FormItem {
  elementRef = document.createElement('div');
  name: string;
  private input: HTMLInputElement;
  private sub: Subscription;
  private readonly btn: HTMLButtonElement;

  constructor(private config: AttrTextField,
              private delegate: (type: string) => Observable<string>) {
    this.name = config.name;
    this.elementRef.classList.add('tbus-form-group');
    this.elementRef.innerHTML = `
    <div class="tbus-form-label">${config.label}</div>
    <div class="tbus-form-control-wrap">
      <input class="tbus-form-control" placeholder="${config.placeholder || ''}" type="text">&nbsp;
      ${config.canUpload ?
      `<button type="button" class="tbus-form-btn" title="${config.uploadBtnText || '上传'}">
        <span class="tbus-icon-upload"></span>
       </button>`
      : ''
      }
    </div>`;
    this.input = this.elementRef.querySelector('input');
    if (config.canUpload) {
      this.btn = this.elementRef.querySelector('button');
      this.btn.addEventListener('click', () => {
        this.btn.classList.add('tbus-form-btn-loading');
        this.input.disabled = true;
        this.btn.children[0].className = 'tbus-icon-loading';
        if (this.sub) {
          this.sub.unsubscribe();
        }
        this.sub = delegate(this.config.uploadType).subscribe({
          next: url => {
            this.update(url);
          },
          complete: () => {
            this.reset();
          }
        });
      });
    }
  }

  update(value?: any): void {
    this.reset();
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

  private reset() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
    this.input.disabled = false;
    if (this.btn) {
      this.btn.classList.remove('tbus-form-btn-loading');
      this.btn.children[0].className = 'tbus-icon-upload';
    }
  }
}
