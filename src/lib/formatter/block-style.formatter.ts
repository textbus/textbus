import {
  MatchRule,
  FormatEffect,
  BlockFormatter,
  FormatData,
  VElement,
  ChildSlotMode,
  FormatterPriority, FormatRendingContext
} from '../core/_api';
import { ColorRGB, parseCss, rgb2Hex } from '@tanbo/color';

export class BlockStyleFormatter extends BlockFormatter {
  constructor(public styleName: string | string[], rule: MatchRule) {
    super(rule, FormatterPriority.BlockStyle);
  }

  read(node: HTMLElement): FormatData {
    return this.extractData(node, {
      styleName: this.styleName
    });
  }

  render(context: FormatRendingContext, existingElement?: VElement) {
    const b = !!existingElement;
    existingElement = existingElement || new VElement('div');
    (Array.isArray(this.styleName) ? this.styleName : [this.styleName]).forEach(name => {
      existingElement.styles.set(name, context.formatData.styles.get(name));
    })
    if (!b) {
      return new ChildSlotMode(existingElement);
    }
  }
}

export const textIndentFormatter = new BlockStyleFormatter('textIndent', {
  styles: {
    textIndent: /.+/
  }
});
export const textAlignFormatter = new BlockStyleFormatter('textAlign', {
  styles: {
    textAlign: /.+/
  }
});

export class BlockBackgroundColorFormatter extends BlockStyleFormatter {
  static blockTags = 'div,p,h1,h2,h3,h4,h5,h6,nav,header,footer,td,th,li,article'.split(',');

  read(node: HTMLElement): FormatData {
    return new FormatData({
      styles: {
        backgroundColor: (color => {
          if (/^rgb\b/.test(color)) {
            return rgb2Hex(parseCss(color) as ColorRGB);
          }
        })(node.style.backgroundColor)
      }
    })
  }

  match(p: HTMLElement) {
    const reg = new RegExp(`^(${BlockBackgroundColorFormatter.blockTags.join('|')})$`, 'i');
    if (!reg.test(p.tagName)) {
      return FormatEffect.Invalid;
    }
    return super.match(p);
  }
}

export const blockBackgroundColorFormatter = new BlockBackgroundColorFormatter('backgroundColor', {
  styles: {
    backgroundColor: /.+/
  }
});
