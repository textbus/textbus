import { Template, TemplateTranslator, ViewData, VElement } from '../core/_api';

export class TableTemplateTranslator implements TemplateTranslator {
  private tagName = 'table';

  match(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLElement): ViewData {
    return {
      template: new TableTemplate(this.tagName),
      childrenSlots: []
    };
  }
}

export class TableTemplate extends Template {
  constructor(public readonly tagName: string) {
    super();
  }

  clone() {
    const template = new TableTemplate(this.tagName);
    this.childSlots.forEach(f => {
      template.childSlots.push(f.clone());
    });
    return template;
  }

  render() {
    return new VElement(this.tagName);
  }
}
