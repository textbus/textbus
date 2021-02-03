import {
  BlockFormatter,
  FormatData,
  FormatEffect, FormatRendingContext,
  FormatterPriority,
  ReplaceMode,
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

  render(context: FormatRendingContext, existingElement?: VElement): ReplaceMode | null {
    if (context.state === FormatEffect.Valid) {
      existingElement = existingElement || new VElement('div');
      existingElement.attrs.set('dir', context.abstractData.attrs.get('dir'));
      return new ReplaceMode(existingElement);
    }
    return null;
  }
}

export const dirFormatter = new DirFormatter();

