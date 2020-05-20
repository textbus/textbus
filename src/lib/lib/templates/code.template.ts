import { Template, TemplateTranslator, ViewData } from '../core/template';
import { Fragment } from '../core/fragment';
import { VElement } from '../core/element';

export class CodeTemplateTranslator implements TemplateTranslator {
  private tagName = 'pre';

  match(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLElement): ViewData {
    const template = new CodeTemplate(el.getAttribute('lang'));
    const slot = new Fragment();
    template.childSlots.push(slot);
    return {
      template,
      childrenSlots: [{
        from: (el.children.length === 1 && el.children[0].tagName.toLowerCase()) === 'code' ?
          el.children[0] as HTMLElement :
          el,
        toSlot: slot
      }]
    };
  }
}

export class CodeTemplate extends Template {
  constructor(private lang: string) {
    super();
  }

  render() {
    const block = new VElement('pre');
    block.attrs.set('lang', this.lang);
    const code = new VElement('code');
    block.appendChild(code);
    this.viewMap.set(this.childSlots[0], code);
    return block;
  }
}
