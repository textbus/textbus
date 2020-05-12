import { Fragment } from './fragment';
import { EditorOptions } from '../editor';
import { RootFragment } from './root-fragment';

export class Parser {
  constructor(private options: EditorOptions) {
  }

  parse(el: HTMLElement) {
    const rootSlot = new RootFragment();
    this.readTemplate(el, rootSlot);
    return rootSlot;
  }

  private readTemplate(el: Node, slot: Fragment) {
    if (el.nodeType === 1) {
      const templates = this.options.templates;
      for (const t of templates) {
        if (t.match(el as HTMLElement)) {
          const viewData = t.from(el as HTMLElement);
          slot.append(viewData.template);
          viewData.childrenSlots.forEach(item => {
            this.readTemplate(item.from, item.toSlot);
          })
          return;
        }
      }
      const maps = this.readFormats(el as HTMLElement);
      const startIndex = slot.contentLength;
      Array.from(el.childNodes).forEach(child => {
        this.readTemplate(child, slot);
      })
      maps.forEach(item => {
        slot.mergeFormat({
          startIndex,
          endIndex: slot.contentLength,
          renderer: item.formatter,
          abstractData: item.abstractData
        })
      })
    } else if (el.nodeType === 3) {
      slot.append(el.textContent);
    }
  }

  private readFormats(el: HTMLElement) {
    return this.options.formats.filter(formatter => formatter.match(el)).map(formatter => {
      return {
        formatter,
        abstractData: formatter.read(el as HTMLElement)
      }
    });
  }
}
