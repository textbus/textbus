import { Observable } from 'rxjs';

import { Formatter } from './formatter';
import { TBRange } from '../../range';
import { EditFrame } from '../edit-frame';
import { MatchStatus } from '../../matcher';
import { AttrState } from '../../formats/forms/help';

export class TableFormatter implements Formatter {
  readonly recordHistory = true;
  private rows = 0;
  private cols = 0;
  private header = false;

  constructor(attrs: AttrState[] | Observable<AttrState[]>) {
    if (attrs instanceof Observable) {
      attrs.subscribe(r => {
        this.init(r);
      })
    } else {
      this.init(attrs);
    }
  }

  format(range: TBRange, frame: EditFrame, matchStatus: MatchStatus): void {
    range.rawRange.collapse();
    const doc = frame.contentDocument;
    const table = doc.createElement('table');
    if (this.header) {
      table.appendChild(this.createHeader(doc));
    }
    const tbody = doc.createElement('tbody');
    table.appendChild(tbody);
    this.createRows(doc).forEach(tr => tbody.appendChild(tr));
    range.rawRange.insertNode(table);
  }

  private createHeader(doc: Document): HTMLTableCaptionElement {
    const header = doc.createElement('thead');
    header.innerHTML = `<tr>${Array.from({length: this.cols}).fill('<th></th>').join('')}</tr>`;
    return header;
  }

  private createRows(doc: Document): HTMLTableRowElement[] {
    const result = [];
    for (let i = 0; i < this.rows; i++) {
      const tr = doc.createElement('tr');
      this.createColumns(doc).forEach(td => tr.appendChild(td));
      result.push(tr);
    }
    return result;
  }

  private createColumns(doc: Document): HTMLTableCellElement[] {
    const result = [];
    for (let i = 0; i < this.cols; i++) {
      result.push(doc.createElement('td'));
    }
    return result;
  }

  private init(attrs: AttrState[]) {
    attrs.forEach(item => {
      switch (item.name) {
        case 'rows':
          this.rows = Number(item.value) || 0;
          break;
        case 'cols':
          this.cols = Number(item.value) || 0;
          break;
        case 'header':
          this.header = !!item.value;
          break;
      }
    });
  }
}
