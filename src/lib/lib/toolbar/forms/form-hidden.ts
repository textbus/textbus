import { AttrHidden, AttrState, FormItem } from './help';

export class FormHidden implements FormItem {
  elementRef = document.createElement('input');
  name: string;
  private value: string | boolean | number;

  constructor(private config: AttrHidden) {
    this.name = config.name;
    this.value = config.value;
    this.elementRef.type = 'hidden';
    this.elementRef.value = config.value + '';
  }

  update(value: any): void {
    this.value = value;
  }

  getAttr(): AttrState {
    return {
      name: this.name,
      required: true,
      value: this.value
    }
  }
}
