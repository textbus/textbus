import { FormItem } from './form';

export interface TextFieldConfig {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;

  validateFn?(value: string): string | null;
}

export class TextField extends FormItem<HTMLInputElement, string> {
  name: string;

  constructor(private config: TextFieldConfig) {
    super(document.createElement('input'), config.label);
    this.formControl.type = 'text';
    this.formControl.classList.add('textbus-form-control');
    this.formControl.placeholder = config.placeholder || '';
    this.name = config.name;
    this.formControl.value = config.defaultValue ?? '';
  }

  validateFn(): boolean {
    const s = this.config.validateFn?.(this.formControl.value);
    if (s) {
      this.feedbackElement.innerText = s;
      return false;
    }
    return true;
  }

  viewProvideFn(): HTMLElement {
    return this.elementRef;
  }

  getValue(): string {
    return this.formControl.value;
  }

  setValue(value: string) {
    this.formControl.value = value ?? '';
  }
}
