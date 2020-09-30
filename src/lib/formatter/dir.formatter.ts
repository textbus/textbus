import {
  BlockFormatter,
  FormatAbstractData,
  FormatEffect, FormatRendingContext,
  FormatterPriority,
  ReplaceModel,
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

  read(node: HTMLElement): FormatAbstractData {
    return this.extractData(node, {
      attrs: ['dir']
    });
  }

  render(context: FormatRendingContext, existingElement?: VElement): ReplaceModel | null {
    if (context.state === FormatEffect.Valid) {
      existingElement = existingElement || new VElement('div');
      existingElement.attrs.set('dir', context.abstractData.attrs.get('dir'));
      return new ReplaceModel(existingElement);
    }
    return null;
  }
}

export const dirFormatter = new DirFormatter();

