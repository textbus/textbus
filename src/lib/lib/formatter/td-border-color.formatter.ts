import { BlockFormatter, FormatAbstractData, FormatEffect, FormatterPriority, VElement } from '../core/_api';

export class TdBorderColorFormatter extends BlockFormatter {
  constructor() {
    super({
      styles: {
        borderColor: /.+/
      }
    }, FormatterPriority.BlockStyle);
  }

  match(p: HTMLElement | FormatAbstractData): FormatEffect {
    if (p instanceof HTMLElement) {
      if (/^(td|th)$/.test(p.nodeName.toLowerCase())) {
        if (p.style.borderColor) {
          return FormatEffect.Valid;
        }
      }
      return FormatEffect.Invalid;
    }
    return super.match(p);
  }

  read(node: HTMLElement): FormatAbstractData {
    return this.extractData(node, {
      styleName: 'borderColor'
    });
  }

  render(isProduction: boolean, state: FormatEffect, abstractData: FormatAbstractData, existingElement?: VElement): null {
    if (existingElement) {
      existingElement.styles.set(abstractData.style.name, abstractData.style.value);
    }
    return null;
  }
}

export const tdBorderColorFormatter = new TdBorderColorFormatter();
