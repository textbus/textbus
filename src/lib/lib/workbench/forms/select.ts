import { FormItem } from './form';

export interface SelectConfig {
  label: string;
  name: string;
  options: Array<{ label: string, value?: string, selected?: boolean }>;

  validateFn?(value: string): string | null;
}

export class Select extends FormItem<HTMLSelectElement, string> {
  name: string;

  constructor(private config: SelectConfig) {
    super(document.createElement('select'), config.label);
    this.name = config.name;
    this.formControl.classList.add('textbus-form-control');
    config.options.forEach(item => {
      const option = document.createElement('option');
      option.label = item.label;
      option.value = item.value;
      if (item.selected) {
        option.selected = true;
      }
      this.formControl.appendChild(option);
    })
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
