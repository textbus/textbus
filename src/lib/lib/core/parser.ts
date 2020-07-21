import { Fragment } from './fragment';
import { FormatEffect, Formatter } from './formatter';
import { BranchComponent, DivisionComponent, ComponentReader, BackboneComponent } from './component';

/**
 * Parser 类用于把一段 DOM 转换为组件（Component）和可编辑片段（Fragment）的抽象数据树
 */
export class Parser {
  constructor(private componentReaders: ComponentReader[] = [],
              private formatters: Formatter[] = []) {
  }

  parse(el: HTMLElement) {
    const rootSlot = new Fragment();
    this.readComponent(el, rootSlot);
    return rootSlot;
  }

  private readComponent(el: Node, slot: Fragment) {
    if (el.nodeType === Node.ELEMENT_NODE) {
      for (const t of this.componentReaders) {
        if (t.match(el as HTMLElement)) {
          const viewData = t.from(el as HTMLElement);
          slot.append(viewData.component, false);
          viewData.slotsMap.forEach(item => {
            if (!item.from) {
              return;
            }
            if (viewData.component instanceof DivisionComponent ||
              viewData.component instanceof BranchComponent ||
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
      }), false);
    }
  }

  private readFormats(el: HTMLElement, slot: Fragment) {
    const maps = this.formatters.map(f => {
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
      slot.apply(item.formatter, {
        startIndex,
        endIndex: slot.contentLength,
        abstractData: item.abstractData,
        state: item.state
      }, {
        important: false
      })
    })
  }
}
