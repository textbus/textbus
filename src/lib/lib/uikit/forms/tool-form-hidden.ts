import { AttrHidden, AttrState, ToolFormItem } from './help';

export class ToolFormHidden implements ToolFormItem {
  readonly elementRef = document.createElement('input');
  readonly name: string;
  private readonly value: string | boolean | number;

  constructor(private config: AttrHidden) {
    this.name = config.name;
    this.value = config.value;
    this.elementRef.type = 'hidden';
    this.elementRef.value = config.value + '';
  }

  update(): void {
    // this.value = value;
  }

  getAttr(): AttrState {
    return {
      name: this.name,
      required: true,
      value: this.value
    }
  }
}
