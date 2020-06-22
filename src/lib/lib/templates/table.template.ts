import { BackboneTemplate, EventType, Fragment, SlotMap, TemplateTranslator, VElement, ViewData } from '../core/_api';
import { SingleTagTemplate } from './single-tag.template';

export interface TableCell {
  colspan: number;
  rowspan: number;
  fragment: Fragment;
}

export interface TableInitParams {
  headers?: TableCell[][];
  bodies: TableCell[][];
}

export class TableTemplateTranslator implements TemplateTranslator {
  private tagName = 'table';

  match(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLTableElement): ViewData {
    const {tHead, tBodies, tFoot} = el;
    const slots: SlotMap[] = [];
    const headers: TableCell[][] = [];
    const bodies: TableCell[][] = [];
    if (tHead) {
      Array.from(tHead.rows).forEach(row => {
        const arr: TableCell[] = [];
        headers.push(arr);
        Array.from(row.cells).forEach(cell => {
          const fragment = new Fragment();
          arr.push({
            rowspan: cell.rowSpan,
            colspan: cell.colSpan,
            fragment
          });
          slots.push({
            from: cell,
            toSlot: fragment
          });
        })
      });
    }

    if (tBodies) {
      Array.of(...Array.from(tBodies), tFoot || {rows: []}).reduce((value, next) => {
        return value.concat(Array.from(next.rows));
      }, [] as HTMLTableRowElement[]).forEach(row => {
        const arr: TableCell[] = [];
        bodies.push(arr);
        Array.from(row.cells).forEach(cell => {
          const fragment = new Fragment();
          arr.push({
            rowspan: cell.rowSpan,
            colspan: cell.colSpan,
            fragment
          });
          slots.push({
            from: cell,
            toSlot: fragment
          });
        })
      });
    }

    return {
      template: new TableTemplate({
        headers,
        bodies
      }),
      childrenSlots: slots
    };
  }
}

export class TableTemplate extends BackboneTemplate {
  constructor(public config: TableInitParams) {
    super('table');
    const bodyConfig = config.bodies;
    for (const row of bodyConfig) {
      for (const col of row) {
        this.childSlots.push(col.fragment);
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
    const bodyConfig = this.config.bodies;
    if (bodyConfig.length) {
      const body = new VElement('tbody');
      table.appendChild(body);
      for (const row of bodyConfig) {
        const tr = new VElement('tr');
        body.appendChild(tr);
        for (const col of row) {
          const td = new VElement('td');
          if (col.colspan > 1) {
            td.attrs.set('colSpan', col.colspan);
          }
          if (col.rowspan > 1) {
            td.attrs.set('rowSpan', col.rowspan);
          }
          this.viewMap.set(col.fragment, td);
          tr.appendChild(td);
          td.events.subscribe(event => {
            if (event.type === EventType.onEnter) {
              const firstRange = event.selection.firstRange;
              col.fragment.insert(new SingleTagTemplate('br'), firstRange.startIndex);
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
