import { AttrState, AttrTextField, FormItem } from './help';

export class FormTextField implements FormItem {
  host = document.createElement('div');

  constructor(private config: AttrTextField) {
  }

  getAttr(): AttrState {
    return {
      name: 'name',
      required: false,
      value: 'value'
    }
  }
}
