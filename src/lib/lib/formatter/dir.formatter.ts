import {
  BlockFormatter,
  FormatAbstractData,
  FormatEffect,
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

  render(isProduction: boolean, state: FormatEffect, abstractData: FormatAbstractData, existingElement?: VElement): ReplaceModel | null {
    if (state === FormatEffect.Valid) {
      existingElement = existingElement || new VElement('div');
      existingElement.attrs.set('dir', abstractData.attrs.get('dir'));
      return new ReplaceModel(existingElement);
    }
    return null;
  }
}

export const dirFormatter = new DirFormatter();

