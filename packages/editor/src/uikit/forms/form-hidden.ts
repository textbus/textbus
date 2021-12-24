import { FormHiddenParams, AttrState, FormItem } from './help'

export class FormHidden implements FormItem {
  readonly elementRef = document.createElement('input')
  readonly name: string
  private readonly value: string | boolean | number

  constructor(private config: FormHiddenParams) {
    this.name = config.name
    this.value = config.value
    this.elementRef.type = 'hidden'
    this.elementRef.value = config.value + ''
  }

  reset() {
    //
  }

  update(): void {
    // this.value = value;
  }

  getAttr(): AttrState<any> {
    return {
      name: this.name,
      value: this.value
    }
  }

  validate() {
    return true
  }
}
