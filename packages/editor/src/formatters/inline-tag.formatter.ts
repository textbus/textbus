import { FormatType, InlineFormatter, VElement } from '@textbus/core'

import { Matcher, MatchRule } from './matcher'

export class InlineTagFormatLoader extends Matcher {
  constructor(formatter: InlineFormatter, rule: MatchRule) {
    super(formatter, rule)
  }

  read() {
    return true
  }
}

export class InlineTagFormatter implements InlineFormatter {
  type: FormatType.InlineTag = FormatType.InlineTag

  constructor(public name: string,
              public tagName: string) {
  }

  render() {
    return new VElement(this.tagName)
  }
}

// 行内标签
export const boldFormatter = new InlineTagFormatter('bold', 'strong')
export const italicFormatter = new InlineTagFormatter('italic', 'em')
export const strikeThroughFormatter = new InlineTagFormatter('strikeThrough', 'del')
export const underlineFormatter = new InlineTagFormatter('underline', 'u')
export const subscriptFormatter = new InlineTagFormatter('subscript', 'sub')
export const superscriptFormatter = new InlineTagFormatter('superscript', 'sup')
export const codeFormatter = new InlineTagFormatter('code', 'code')
export const boldFormatLoader = new InlineTagFormatLoader(boldFormatter, {
  tags: ['strong', 'b'],
  styles: {
    fontWeight: ['bold', '500', '600', '700', '800', '900']
  },
  excludeStyles: {
    fontWeight: ['normal', 'lighter', '100', '200', '300', '400']
  }
})

export const italicFormatLoader = new InlineTagFormatLoader(italicFormatter, {
  tags: ['em', 'i'],
  styles: {
    fontStyle: ['italic']
  },
  excludeStyles: {
    fontStyle: /(?!italic).+/
  }
})

export const strikeThroughFormatLoader = new InlineTagFormatLoader(strikeThroughFormatter, {
  tags: ['strike', 'del', 's'],
  styles: {
    textDecoration: /\bline-through\b/
  }
})
export const underlineFormatLoader = new InlineTagFormatLoader(underlineFormatter, {
  tags: ['u'],
  styles: {
    textDecoration: /\bunderline\b/
  }
})
export const subscriptFormatLoader = new InlineTagFormatLoader(subscriptFormatter, {
  tags: ['sub']
})
export const superscriptFormatLoader = new InlineTagFormatLoader(superscriptFormatter, {
  tags: ['sup']
})
export const codeFormatLoader = new InlineTagFormatLoader(codeFormatter, {
  tags: ['code']
})
