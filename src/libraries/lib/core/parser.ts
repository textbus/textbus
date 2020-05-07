import { EditableFragment } from './editable-fragment';
import { EditorOptions } from '../editor';
import { Template } from './template';
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
          const viewData = t.from(el as HTMLElement);
          slot.append(new Template(viewData.abstractData, t));
          viewData.childrenSlots.forEach(item => {
            this.readTemplate(item.from, item.toSlot);
          })
          return 1;
        }
      }
      const maps = this.readFormats(el as HTMLElement);
      const startIndex = slot.contentLength;
      let endIndex = startIndex;
      Array.from(el.childNodes).forEach(child => {
        endIndex += this.readTemplate(child, slot);
      })
      maps.forEach(item => {
        slot.mergeFormat({
          startIndex,
          endIndex,
          renderer: item.formatter,
          abstractData: item.abstractData
        })
      })
      return endIndex;
    } else if (el.nodeType === 3) {
      slot.append(el.textContent);
      return el.textContent.length;
    }
  }

  private readFormats(el: HTMLElement) {
    return this.options.formats.filter(formatter => formatter.is(el)).map(formatter => {
      return {
        formatter,
        abstractData: formatter.read(el as HTMLElement)
      }
    });
  }
}
