import { VElement, VTextNode } from '@textbus/core'
import { Injectable } from '@tanbo/di'

/**
 * HTML 输出转换器
 */
@Injectable()
export class OutputTranslator {
  static singleTags = 'br,img,hr'.split(',')

  static simpleXSSFilter = {
    text(text: string) {
      return text.replace(/[><&]/g, str => {
        return {
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;'
        }[str] as string
      })
    },
    attrName(text: string) {
      return text.replace(/[><"'&]/g, str => {
        return {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          '\'': '&#x27;',
          '&': '&amp;'
        }[str] as string
      })
    },
    attrValue(text: string) {
      return text.replace(/["']/g, str => {
        return {
          '"': '&quot;',
          '\'': '&#x27;'
        }[str] as string
      })
    }
  }

  private singleTagTest = new RegExp(`^(${OutputTranslator.singleTags.join('|')})$`, 'i')

  transform(vDom: VElement): string {
    return vDom.children.map(child => {
      return this.vDomToHTMLString(child)
    }).join('')
  }

  private vDomToHTMLString(vDom: VElement | VTextNode): string {
    const xssFilter = OutputTranslator.simpleXSSFilter

    if (vDom instanceof VTextNode) {
      return this.replaceEmpty(xssFilter.text(vDom.textContent), '&nbsp;')
    }

    const styles = Array.from(vDom.styles.keys()).filter(key => {
      const v = vDom.styles.get(key)
      return !(v === undefined || v === null || v === '')
    }).map(key => {
      const k = key.replace(/(?=[A-Z])/g, '-').toLowerCase()
      return xssFilter.attrValue(`${k}:${vDom.styles.get(key)}`)
    }).join(';')

    const attrs = Array.from(vDom.attrs.keys()).filter(key => key !== 'ref' && vDom.attrs.get(key) !== false).map(k => {
      const key = xssFilter.attrName(k)
      const value = vDom.attrs.get(k)
      return (value === true ? `${key}` : `${key}="${xssFilter.attrValue(`${value}`)}"`)
    })

    if (styles) {
      attrs.push(`style="${styles}"`)
    }

    if (vDom.classes && vDom.classes.size) {
      attrs.push(`class="${xssFilter.attrValue(Array.from(vDom.classes).join(' '))}"`)
    }

    let attrStr = attrs.join(' ')
    attrStr = attrStr ? ' ' + attrStr : ''
    if (this.singleTagTest.test(vDom.tagName)) {
      return `<${vDom.tagName}${attrStr}>`
    }
    const childHTML = vDom.children.map(child => {
      return this.vDomToHTMLString(child)
    }).join('')

    return [
      `<${vDom.tagName}${attrStr}>`,
      childHTML,
      `</${vDom.tagName}>`
    ].join('')
  }

  private replaceEmpty(s: string, target: string) {
    return s.replace(/\s\s+/g, str => {
      return ' ' + Array.from({
        length: str.length - 1
      }).fill(target).join('')
    }).replace(/^\s|\s$/g, target)
  }
}
