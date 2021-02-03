import {
  ChildSlotMode,
  FormatAbstractData,
  FormatEffect,
  FormatRendingContext,
  FormatterPriority,
  InlineFormatter,
  ReplaceMode,
  VElement
} from '../core/_api';

abstract class PaddingFormatter extends InlineFormatter {
  reg: RegExp;

  protected constructor(private tags: string[]) {
    super({}, FormatterPriority.InlineStyle);
    this.reg = new RegExp(`^(${tags.join('|')})$`, 'i');
  }

  match(p: HTMLElement | FormatAbstractData): FormatEffect {
    if (!this.reg.test(p instanceof FormatAbstractData ? p.tag : p.tagName)) {
      return FormatEffect.Invalid;
    }
    const styleKeys = ['padding', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']
    if (p instanceof FormatAbstractData) {
      return styleKeys.map(key => p.styles.get(key)).filter(i => !!i).length > 0 ? FormatEffect.Valid : FormatEffect.Invalid;
    }
    return styleKeys.map(key => p.style[key]).filter(i => !!i).length > 0 ? FormatEffect.Valid : FormatEffect.Invalid;
  }

  read(node: HTMLElement): FormatAbstractData {
    return this.extractData(node, {
      styleName: ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']
    });
  }

  render(context: FormatRendingContext, existingElement?: VElement): ReplaceMode | ChildSlotMode | null {
    const padding = [
      context.abstractData.styles.get('paddingTop'),
      context.abstractData.styles.get('paddingRight'),
      context.abstractData.styles.get('paddingBottom'),
      context.abstractData.styles.get('paddingLeft'),
    ].map(i => i || 0);
    if (existingElement && this.reg.test(existingElement.tagName)) {
      existingElement.styles.set('padding', padding.join(' '));
      return null;
    }
    existingElement = new VElement('span');
    existingElement.styles.set('padding', padding.join(' '));
    return new ChildSlotMode(existingElement);
  }
}

export class InlinePaddingFormatter extends PaddingFormatter {
  static inlineTags = 'span,em,i,s,del,sup,sub,u,strong'.split(',');

  constructor() {
    super(InlinePaddingFormatter.inlineTags);
  }
}

export class BlockPaddingFormatter extends PaddingFormatter {
  static blockTags = 'div,p,h1,h2,h3,h4,h5,h6,nav,header,footer,td,th,li,article'.split(',');

  constructor() {
    super(BlockPaddingFormatter.blockTags);
  }
}

export const inlinePaddingFormatter = new InlinePaddingFormatter();
export const blockPaddingFormatter = new BlockPaddingFormatter();
