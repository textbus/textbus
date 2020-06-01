import { Template, TemplateTranslator, ViewData, Fragment, VElement, EventType } from '../core/_api';
import { SingleTemplate } from './single.template';

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
  constructor(public lang: string) {
    super('pre');
  }

  clone() {
    const template = new CodeTemplate(this.lang);
    this.childSlots.forEach(f => {
      template.childSlots.push(f.clone());
    });
    return template;
  }

  render() {
    const block = new VElement('pre');
    block.attrs.set('lang', this.lang);
    const code = new VElement('code');
    code.events.subscribe(event => {
      if (event.type === EventType.onEnter) {
        const firstRange = event.selection.firstRange;
        this.childSlots[0].insert(new SingleTemplate('br'), firstRange.startIndex);
        firstRange.startIndex = firstRange.endIndex = firstRange.startIndex + 1;
      }
    })
    block.appendChild(code);
    this.viewMap.set(this.childSlots[0], code);
    return block;
  }
}
