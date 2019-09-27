import { AttrSequence, AttrState, FormItem } from './help';

export class FormSequence implements FormItem {
  host = document.createElement('div');

  constructor(private config: AttrSequence) {
  }

  getAttr(): AttrState {
    return {
      name: 'name',
      required: false,
      value: 'value'
    }
  }
}
