import { Template, TemplateTranslator, ViewData } from '../core/template';
import { Fragment } from '../core/fragment';
import { VElement } from '../core/element';

export class BlockTemplateTranslator implements TemplateTranslator {
  constructor(private tagName: string) {
  }

  is(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLElement): ViewData {
    const template = new BlockTemplate(this.tagName);
    const slot = new Fragment();
    template.childSlots.push(slot);
    return {
      template,
      childrenSlots: [{
        from: el,
        toSlot: slot
      }]
    };
  }
}

export class BlockTemplate extends Template {
  constructor(private tagName: string) {
    super();
  }

  render() {
    const block = new VElement(this.tagName);
    this.viewMap.set(this.childSlots[0], block);
    return block;
  }
}
