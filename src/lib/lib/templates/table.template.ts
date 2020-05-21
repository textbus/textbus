import { Template, TemplateTranslator, ViewData } from '../core/template';
import { VElement } from '../core/element';

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

  render() {
    return new VElement(this.tagName);
  }
}
