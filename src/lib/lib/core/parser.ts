import { Fragment } from './fragment';
import { EditorOptions } from '../editor';
import { FormatEffect } from './formatter';
import { BackboneComponent, BranchComponent } from './component';

export class Parser {
  constructor(private options: EditorOptions) {
  }

  parse(el: HTMLElement) {
    const rootSlot = new Fragment();
    this.readComponent(el, rootSlot);
    return rootSlot;
  }

  private readComponent(el: Node, slot: Fragment) {
    if (el.nodeType === Node.ELEMENT_NODE) {
      const components = this.options.componentReaders;
      for (const t of components) {
        if (t.match(el as HTMLElement)) {
          const viewData = t.from(el as HTMLElement);
          slot.append(viewData.component);
          viewData.slotsMap.forEach(item => {
            if (viewData.component instanceof BranchComponent ||
              viewData.component instanceof BackboneComponent ||
              item.from === el) {
              this.readFormats(item.from, item.toSlot);
            } else {
              this.readComponent(item.from, item.toSlot);
            }
          })
          return;
        }
      }
      this.readFormats(el as HTMLElement, slot);
    } else if (el.nodeType === Node.TEXT_NODE) {
      slot.append(el.textContent.replace(/&lt;|&gt;|&amp;|&nbsp;/g, str => {
        return {
          '&lt;': '<',
          '&gt;': '>',
          '&amp;': '&',
          '&nbsp;': ' '
        }[str];
      }));
    }
  }

  private readFormats(el: HTMLElement, slot: Fragment) {
    const maps = this.options.formatters.map(f => {
      return {
        formatter: f,
        state: f.match(el)
      }
    }).filter(p => p.state !== FormatEffect.Invalid).map(p => {
      return {
        ...p,
        abstractData: p.formatter.read(el as HTMLElement)
      }
    });
    const startIndex = slot.contentLength;
    Array.from(el.childNodes).forEach(child => {
      this.readComponent(child, slot);
    })
    maps.forEach(item => {
      slot.apply({
        startIndex,
        endIndex: slot.contentLength,
        renderer: item.formatter,
        abstractData: item.abstractData,
        state: item.state
      }, {
        important: false
      })
    })
  }
}
