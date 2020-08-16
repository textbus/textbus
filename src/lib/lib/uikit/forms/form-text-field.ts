import { Observable, Subscription } from 'rxjs';

import { AttrState, TextField, FormItem } from './help';

export class FormTextField implements FormItem {
  elementRef = document.createElement('div');
  name: string;
  private input: HTMLInputElement;
  private sub: Subscription;
  private readonly btn: HTMLButtonElement;

  constructor(private config: TextField,
              private delegate: (type: string) => Observable<string>) {
    this.name = config.name;
    this.elementRef.classList.add('textbus-form-group');
    this.elementRef.innerHTML = `
    <div class="textbus-control-label">${config.label}</div>
    <div class="textbus-control-value">
      <div class="textbus-input-group textbus-input-block">
        <input class="textbus-form-control textbus-input-block" placeholder="${config.placeholder || ''}" type="text" value="${config.value || ''}">${config.canUpload ?
        `<button type="button" class="textbus-btn textbus-btn-dark" title="${config.uploadBtnText || '上传'}">
          <span class="textbus-icon-upload"></span>
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
        this.btn.classList.add('textbus-btn-loading');
        this.input.disabled = true;
        this.btn.children[0].className = 'textbus-icon-loading';
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
      value: this.input.value
    }
  }

  validateFn(): string | null {
    return this.config.validateFn?.(this.getAttr().value)
  }

  private reset() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
    this.input.disabled = false;
    if (this.btn) {
      this.btn.classList.remove('textbus-btn-loading');
      this.btn.children[0].className = 'textbus-icon-upload';
    }
  }
}
