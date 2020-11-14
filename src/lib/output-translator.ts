import { VElement, Renderer, VTextNode } from './core/_api';

export interface OutputTranslator<T> {
  transform(vDom: VElement): T;
}

export class HTMLOutputTranslator implements OutputTranslator<string> {
  transform(vDom: VElement): string {
    return vDom.childNodes.map(child => {
      return this.vDomToHTMLString(child);
    }).join('');
  }

  private vDomToHTMLString(vDom: VElement | VTextNode): string {
    if (vDom instanceof VTextNode) {
      return Renderer.replaceEmpty(vDom.textContent.replace(/[><&]/g, str => {
        return {
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;'
        }[str];
      }), '&nbsp;');
    }
    const styles = Array.from(vDom.styles.keys()).filter(key => {
      const v = vDom.styles.get(key);
      return !(v === undefined || v === null || v === '');
    }).map(key => {
      const k = key.replace(/[A-Z]/g, str => '-' + str.toLocaleLowerCase());
      return `${k}:${vDom.styles.get(key)}`.replace(/"/g, '&quot;');
    }).join(';');
    const attrs = Array.from(vDom.attrs.keys()).filter(key => vDom.attrs.get(key) !== false).map(key => {
      const value = vDom.attrs.get(key);
      return (value === true ? `${key}` : `${key}="${(value + '').replace(/"/g, '&quot;')}"`);
    });
    if (styles) {
      attrs.push(`style="${styles}"`);
    }
    if (vDom.classes && vDom.classes.length) {
      attrs.push(`class="${vDom.classes.join(' ').replace(/"/g, '&quot;')}"`);
    }
    let attrStr = attrs.join(' ');
    attrStr = attrStr ? ' ' + attrStr : '';
    if (/^(br|img|hr)$/.test(vDom.tagName)) {
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
