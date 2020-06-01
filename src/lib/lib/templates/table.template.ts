import { Template, TemplateTranslator, ViewData, VElement } from '../core/_api';

export class TableTemplateTranslator implements TemplateTranslator {
  private tagName = 'table';

  match(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLElement): ViewData {
    return {
      template: new TableTemplate(),
      childrenSlots: []
    };
  }
}

export class TableTemplate extends Template {
  constructor() {
    super('table');
  }

  clone() {
    const template = new TableTemplate();
    this.childSlots.forEach(f => {
      template.childSlots.push(f.clone());
    });
    return template;
  }

  render() {
    return new VElement(this.tagName);
  }
}
