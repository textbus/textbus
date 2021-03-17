import {
  BlockFormatter,
  FormatData,
  FormatEffect,
  FormatRendingContext,
  FormatterPriority,
  InlineFormatter,
  VElement
} from '../core/_api';

function match(reg: RegExp, p: HTMLElement): FormatEffect {
  if (!reg.test(p.tagName)) {
    return FormatEffect.Invalid;
  }
  const styleKeys = ['padding', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']
  return styleKeys.map(key => p.style[key]).filter(i => !!i).length > 0 ? FormatEffect.Valid : FormatEffect.Invalid;
}

function render(reg: RegExp, context: FormatRendingContext, existingElement?: VElement) {
  const padding = [
    context.formatData.styles.get('paddingTop'),
    context.formatData.styles.get('paddingRight'),
    context.formatData.styles.get('paddingBottom'),
    context.formatData.styles.get('paddingLeft'),
  ].map(i => i || 0);
  if (existingElement && reg.test(existingElement.tagName)) {
    existingElement.styles.set('padding', padding.join(' '));
    return null;
  }
  existingElement = new VElement('span');
  existingElement.styles.set('padding', padding.join(' '));
  return existingElement;
}

export class InlinePaddingFormatter extends InlineFormatter {
  static inlineTags = 'span,em,i,s,del,sup,sub,u,strong'.split(',');
  reg: RegExp;

  constructor() {
    super({}, FormatterPriority.InlineStyle);
    this.reg = new RegExp(`^(${InlinePaddingFormatter.inlineTags.join('|')})$`, 'i');
  }

  match(p: HTMLElement): FormatEffect {
    return match(this.reg, p);
  }

  read(node: HTMLElement): FormatData {
    return this.extractData(node, {
      styleName: ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']
    });
  }

  render(context: FormatRendingContext, existingElement?: VElement) {
    return render(this.reg, context, existingElement);
  }
}

export class BlockPaddingFormatter extends BlockFormatter {
  static blockTags = 'div,p,h1,h2,h3,h4,h5,h6,nav,header,footer,td,th,li,article'.split(',');
  reg: RegExp;

  constructor() {
    super({}, FormatterPriority.InlineStyle);
    this.reg = new RegExp(`^(${BlockPaddingFormatter.blockTags.join('|')})$`, 'i');
  }

  match(p: HTMLElement): FormatEffect {
    return match(this.reg, p);
  }

  read(node: HTMLElement): FormatData {
    return this.extractData(node, {
      styleName: ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']
    });
  }

  render(context: FormatRendingContext, existingElement?: VElement) {
    return render(this.reg, context, existingElement);
  }
}

export const inlinePaddingFormatter = new InlinePaddingFormatter();
export const blockPaddingFormatter = new BlockPaddingFormatter();
