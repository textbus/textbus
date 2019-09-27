import { AttrOptions, AttrState, FormItem } from './help';

export class FormOptions implements FormItem {
  host = document.createElement('div');

  constructor(private config: AttrOptions) {
  }

  getAttr(): AttrState {
    return {
      name: 'name',
      required: false,
      value: 'value'
    }
  }
}
