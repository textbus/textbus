import { EditableFragment } from './editable-fragment';
import { EditorOptions } from '../editor';
import { FormatRange } from './formatter';

export class Parser {
  constructor(private options: EditorOptions) {
  }

  parse(el: HTMLElement) {
    const rootSlot = new EditableFragment();
    this.readTemplate(el, rootSlot);
    return rootSlot;
  }

  private readTemplate(el: Node, slot: EditableFragment) {
    if (el.nodeType === 1) {
      const templates = this.options.templates;
      for (const t of templates) {
        if (t.is(el as HTMLElement)) {
          slot.append(t);
          t.from(el as HTMLElement).forEach(item => {
            this.readFormats(item.from as HTMLElement, item.inSlot);
            item.from.childNodes.forEach(c => this.readTemplate(c, item.inSlot));
          });
          return;
        }
      }
      this.readFormats(el as HTMLElement, slot);
    } else if (el.nodeType === 3) {
      slot.append(el.textContent);
    }
  }

  private readFormats(el: HTMLElement, slot: EditableFragment) {
    this.options.formats.map(formatter => {
      if (formatter.is(el)) {
        slot.mergeFormat(new FormatRange(formatter.extractData(el as HTMLElement), formatter));
      }
    });
  }
}
