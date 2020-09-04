import {
  BlockFormatter,
  FormatAbstractData,
  FormatEffect,
  FormatRendingContext,
  FormatterPriority,
  VElement
} from '../core/_api';

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
        const style = p.style;
        if (style.borderColor ||
          style.borderLeftColor ||
          style.borderTopColor ||
          style.borderRightColor ||
          style.borderBottomColor) {
          return FormatEffect.Valid;
        }
      }
      return FormatEffect.Invalid;
    }
    return super.match(p);
  }

  read(node: HTMLElement): FormatAbstractData {
    const styles = node.style;

    const obj: { [key: string]: string | number } = {};

    ['borderColor', 'borderLeftColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor'].forEach(key => {
      const value = styles[key];
      if (value) {
        if (key !== 'borderColor' && value === obj['borderColor']) {
          return;
        }
        obj[key] = value;
      }
    })
    return new FormatAbstractData({
      styles: obj
    });
  }

  render(context: FormatRendingContext, existingElement?: VElement): null {
    if (existingElement) {
      context.abstractData.styles.forEach((value, key) => {
        existingElement.styles.set(key, value);
      });
    }
    return null;
  }
}

export const tdBorderColorFormatter = new TdBorderColorFormatter();
