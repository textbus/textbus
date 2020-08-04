export abstract class FormItem<T extends Node, U> {
  abstract name: string;
  readonly elementRef = document.createElement('div');

  protected feedbackElement = document.createElement('div');
  private labelElement = document.createElement('label');
  private inputWrapper = document.createElement('div');

  protected constructor(public formControl: T, public label: string) {
    this.elementRef.classList.add('textbus-form-group');
    this.labelElement.classList.add('textbus-control-label');
    this.inputWrapper.classList.add('textbus-control-value');
    this.feedbackElement.classList.add('textbus-control-feedback-invalid');

    this.labelElement.innerText = label;
    this.inputWrapper.append(this.formControl, this.feedbackElement);
    this.elementRef.append(this.labelElement, this.inputWrapper);
  }

  abstract getValue(): U;

  abstract setValue(value: U): void;

  abstract validateFn(): boolean;

  abstract viewProvideFn(): HTMLElement;
}

export interface FormOptions<T extends Node, U> {
  title: string;
  items: FormItem<T, U>[];
  confirmButtonText?: string;
  cancelButtonText?: string;
}

export class Form<T extends Node, U> {
  onSubmit: () => any;
  onClose: () => any;
  readonly elementRef = document.createElement('form');
  private titleElement = document.createElement('h3');
  private groupsElement = document.createElement('div');
  private btnWrapper = document.createElement('div');
  private confirmBtn = document.createElement('button');
  private cancelBtn = document.createElement('button');

  constructor(private options: FormOptions<T, U>) {
    this.titleElement.classList.add('textbus-form-title');
    this.titleElement.innerText = options.title;
    this.confirmBtn.innerText = options.confirmButtonText || '确认';
    this.confirmBtn.type = 'submit';
    this.confirmBtn.classList.add('textbus-btn', 'textbus-btn-primary');

    this.cancelBtn.innerText = options.cancelButtonText || '取消';
    this.cancelBtn.type = 'button';
    this.cancelBtn.classList.add('textbus-btn', 'textbus-btn-default');

    this.btnWrapper.classList.add('textbus-btn-wrap');
    this.btnWrapper.append(this.confirmBtn, this.cancelBtn);

    this.elementRef.classList.add('textbus-form', 'textbus-form-workbench');
    this.elementRef.append(this.titleElement);

    this.options.items.forEach(item => {
      const view = item.viewProvideFn();
      if (view) {
        this.groupsElement.append(view);
      }
    })

    this.groupsElement.classList.add('textbus-form-groups');
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
    const map = new Map<string, U>()
    this.options.items.forEach(item => {
      map.set(item.name, item.getValue());
    })
    return map;
  }
}
