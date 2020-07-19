export abstract class FormItem {
  abstract name: string;
  readonly elementRef = document.createElement('div');

  protected feedbackElement = document.createElement('div');
  private value: boolean | string | number;
  private labelElement = document.createElement('label');
  private inputWrapper = document.createElement('div');

  protected constructor(public formControl: HTMLInputElement, public label: string) {
    this.elementRef.classList.add('tbus-form-group');
    this.labelElement.classList.add('tbus-control-label');
    this.inputWrapper.classList.add('tbus-control-value');
    this.feedbackElement.classList.add('tbus-control-feedback-invalid');

    this.labelElement.innerText = label;
    this.inputWrapper.append(this.formControl, this.feedbackElement);
    this.elementRef.append(this.labelElement, this.inputWrapper);
  }

  getValue() {
    return this.value
  }

  setValue(value: string | boolean | number) {
    this.value = value;
  };

  abstract validateFn(): boolean;

  abstract viewProvideFn(): HTMLElement;
}

export interface FormOptions {
  title: string;
  items: FormItem[];
  confirmButtonText?: string;
  cancelButtonText?: string;
}

export class Form {
  onSubmit: () => any;
  onClose: () => any;
  readonly elementRef = document.createElement('form');
  private titleElement = document.createElement('h3');
  private groupsElement = document.createElement('div');
  private btnWrapper = document.createElement('div');
  private confirmBtn = document.createElement('button');
  private cancelBtn = document.createElement('button');

  constructor(private options: FormOptions) {
    this.titleElement.classList.add('tbus-form-title');
    this.titleElement.innerText = options.title;
    this.confirmBtn.innerText = options.confirmButtonText || '确认';
    this.confirmBtn.type = 'submit';
    this.confirmBtn.classList.add('tbus-btn', 'tbus-btn-primary');

    this.cancelBtn.innerText = options.cancelButtonText || '取消';
    this.cancelBtn.type = 'button';
    this.cancelBtn.classList.add('tbus-btn', 'tbus-btn-default');

    this.btnWrapper.classList.add('tbus-btn-wrap');
    this.btnWrapper.append(this.confirmBtn, this.cancelBtn);

    this.elementRef.classList.add('tbus-form', 'tbus-form-workbench');
    this.elementRef.append(this.titleElement);

    this.options.items.forEach(item => {
      const view = item.viewProvideFn();
      if (view) {
        this.groupsElement.append(view);
      }
    })

    this.groupsElement.classList.add('tbus-form-groups');
    this.elementRef.append(this.groupsElement);
    this.elementRef.append(this.btnWrapper);

    this.elementRef.onsubmit = ev => {
      const b = this.options.items.map(item => {
        return item.validateFn();
      }).includes(false);

      if (!b) {
        if (typeof this.onSubmit === 'function') {
          this.onSubmit();
        }
      }
      ev.preventDefault();
      return false;
    };
    this.cancelBtn.onclick = () => {
      if (typeof this.onClose === 'function') {
        this.onClose();
      }
    }
  }

  getData() {
    const map = new Map<string, string | number | boolean>()
    this.options.items.forEach(item => {
      map.set(item.name, item.getValue());
    })
    return map;
  }
}
