import { BackboneTemplate, EventType, Fragment, TemplateTranslator, VElement, ViewData } from '../core/_api';
import { SingleTagTemplate } from './single-tag.template';

export interface TableInitParams {
  headerSlots?: Fragment[];
  body: Fragment[][];
}

export class TableTemplateTranslator implements TemplateTranslator {
  private tagName = 'table';

  match(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLElement): ViewData {
    return {
      template: new TableTemplate({
        body: []
      }),
      childrenSlots: []
    };
  }
}

export class TableTemplate extends BackboneTemplate {
  constructor(private config: TableInitParams) {
    super('table');
    const bodyConfig = config.body;
    for (const row of bodyConfig) {
      for (const col of row) {
        this.childSlots.push(col);
      }
    }
  }

  clone() {
    const template = new TableTemplate(this.config);
    this.childSlots.forEach(f => {
      template.childSlots.push(f.clone());
    });
    return template;
  }

  render() {
    const table = new VElement(this.tagName);
    this.viewMap.clear();
    const bodyConfig = this.config.body;
    if (bodyConfig.length) {
      const body = new VElement('tbody');
      table.appendChild(body);
      for (const row of bodyConfig) {
        const tr = new VElement('tr');
        body.appendChild(tr);
        for (const col of row) {
          const td = new VElement('td');
          this.viewMap.set(col, td);
          tr.appendChild(td);
          td.events.subscribe(event => {
            if (event.type === EventType.onEnter) {
              const firstRange = event.selection.firstRange;
              col.insert(new SingleTagTemplate('br'), firstRange.startIndex);
              firstRange.startIndex = firstRange.endIndex = firstRange.startIndex + 1;
            } else if (event.type === EventType.onDelete && event.selection.firstRange.startIndex === 0) {
              event.stopPropagation();
            }
          })
        }
      }
    }

    return table;
  }
}
