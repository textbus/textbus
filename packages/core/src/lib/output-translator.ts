import { VElement, Renderer, VTextNode } from './core/_api';

export abstract class OutputTranslator {
  abstract transform(vDom: VElement): any;
}

/**
 * HTML 输出转换器
 */
export class HTMLOutputTranslator implements OutputTranslator {
  static singleTags = 'br,img,hr'.split(',');

  static simpleXSSFilter = {
    text(text: string) {
      return text.replace(/[><&]/g, str => {
        return {
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;'
        }[str];
      })
    },
    attrName(text: string) {
      return text.replace(/[><"'&]/g, str => {
        return {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        }[str];
      })
    },
    attrValue(text: string) {
      return text.replace(/["']/g, str => {
        return {
          '"': '&quot;',
          "'": '&#x27;'
        }[str];
      })
    }
  }

  private singleTagTest = new RegExp(`^(${HTMLOutputTranslator.singleTags.join('|')})$`, 'i');

  transform(vDom: VElement): string {
    return vDom.childNodes.map(child => {
      return this.vDomToHTMLString(child);
    }).join('');
  }

  private vDomToHTMLString(vDom: VElement | VTextNode): string {
    const xssFilter = HTMLOutputTranslator.simpleXSSFilter;

    if (vDom instanceof VTextNode) {
      return Renderer.replaceEmpty(xssFilter.text(vDom.textContent), '&nbsp;');
    }

    const styles = Array.from(vDom.styles.keys()).filter(key => {
      const v = vDom.styles.get(key);
      return !(v === undefined || v === null || v === '');
    }).map(key => {
      const k = key.replace(/(?=[A-Z])/g, '-').toLowerCase();
      return xssFilter.attrValue(`${k}:${vDom.styles.get(key)}`);
    }).join(';');

    const attrs = Array.from(vDom.attrs.keys()).filter(key => vDom.attrs.get(key) !== false).map(k => {
      const key = xssFilter.attrName(k);
      const value = vDom.attrs.get(k);
      return (value === true ? `${key}` : `${key}="${xssFilter.attrValue(`${value}`)}"`);
    });

    if (styles) {
      attrs.push(`style="${styles}"`);
    }

    if (vDom.classes && vDom.classes.length) {
      attrs.push(`class="${xssFilter.attrValue(vDom.classes.join(' '))}"`);
    }

    let attrStr = attrs.join(' ');
    attrStr = attrStr ? ' ' + attrStr : '';
    if (this.singleTagTest.test(vDom.tagName)) {
      return `<${vDom.tagName}${attrStr}>`;
    }
    const childHTML = vDom.childNodes.map(child => {
      return this.vDomToHTMLString(child);
    }).join('');

    return [
      `<${vDom.tagName}${attrStr}>`,
      childHTML,
      `</${vDom.tagName}>`
    ].join('');
  }
}
