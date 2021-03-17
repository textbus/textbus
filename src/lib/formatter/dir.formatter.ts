import {
  BlockFormatter,
  FormatData,
  FormatEffect, FormatRendingContext,
  FormatterPriority,
  VElement
} from '../core/_api';

export class DirFormatter extends BlockFormatter {
  constructor() {
    super({
      attrs: [{
        key: 'dir',
        value: ['ltr', 'rtl']
      }]
    }, FormatterPriority.Attribute)
  }

  read(node: HTMLElement): FormatData {
    return this.extractData(node, {
      attrs: ['dir']
    });
  }

  render(context: FormatRendingContext, existingElement?: VElement) {
    if (context.effect === FormatEffect.Valid) {
      existingElement = existingElement || new VElement('div');
      existingElement.attrs.set('dir', context.formatData.attrs.get('dir'));
      return existingElement;
    }
    return null;
  }
}

export const dirFormatter = new DirFormatter();

