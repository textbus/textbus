import { Component, FormatHostBindingRender, Formatter, VElement, VTextNode } from '@textbus/core'
import { FormatLoader, FormatLoaderReadResult } from '@textbus/platform-browser'

export const fontFamilyFormatter = new Formatter<string>('fontFamily', {
  render(children: Array<VElement | VTextNode | Component>, formatValue: string): VElement | FormatHostBindingRender {
    return {
      fallbackTagName: 'span',
      attach(host: VElement) {
        return host.styles.set('fontFamily', formatValue)
      }
    }
  }
})

export const fontFamilyFormatLoader: FormatLoader<string> = {
  match(element: HTMLElement): boolean {
    return !!element.style.fontFamily
  },
  read(element: HTMLElement): FormatLoaderReadResult<string> {
    return {
      formatter: fontFamilyFormatter,
      value: element.style.fontFamily
    }
  }
}
