import { Observable, Subscription } from 'rxjs';

import { AttrState, AttrTextField, ToolFormItem } from './help';

export class ToolFormTextField implements ToolFormItem {
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
    <div class="tbus-control-label">${config.label}</div>
    <div class="tbus-control-value">
      <div class="tbus-input-group tbus-input-block">
        <input class="tbus-form-control tbus-input-block" placeholder="${config.placeholder || ''}" type="text" value="${config.value || ''}">${config.canUpload ?
        `<button type="button" class="tbus-btn tbus-btn-dark" title="${config.uploadBtnText || '上传'}">
          <span class="tbus-icon-upload"></span>
         </button>
      </div>
      `
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
    if ([undefined, null].includes(value)) {
      this.input.value = this.config.value || '';
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
