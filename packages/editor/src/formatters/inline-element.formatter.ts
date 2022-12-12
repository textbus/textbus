import { VElement, VTextNode, FormatValue, Formatter } from '@textbus/core'

import { Matcher, MatchRule } from './matcher'
import { FormatLoader } from '@textbus/platform-browser'

export class InlineTagFormatLoader<T extends FormatValue> extends Matcher<T, Formatter<T>> implements FormatLoader<T> {
  constructor(formatter: InlineElementFormatter, rule: MatchRule) {
    super(formatter, rule)
  }

  read() {
    return {
      formatter: this.target,
      value: true as T
    }
  }
}

export class InlineElementFormatter implements Formatter<boolean> {
  constructor(public name: string,
              public tagName: string,
              public columned: boolean) {
  }

  render(children: Array<VElement | VTextNode>) {
    return new VElement(this.tagName, null, children)
  }
}

// 行内标签
export const boldFormatter = new InlineElementFormatter('bold', 'strong', false)
export const italicFormatter = new InlineElementFormatter('italic', 'em', false)
export const strikeThroughFormatter = new InlineElementFormatter('strikeThrough', 'del', true)
export const underlineFormatter = new InlineElementFormatter('underline', 'u', true)
export const subscriptFormatter = new InlineElementFormatter('subscript', 'sub', false)
export const superscriptFormatter = new InlineElementFormatter('superscript', 'sup', false)
export const codeFormatter = new InlineElementFormatter('code', 'code', false)
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
