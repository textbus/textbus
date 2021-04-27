import { Fragment } from './fragment';
import { FormatEffect, Formatter } from './formatter';
import { BranchAbstractComponent, DivisionAbstractComponent, ComponentLoader, BackboneAbstractComponent } from './component';

/**
 * Parser 类用于把一段 DOM 转换为组件（Component）和可编辑片段（Fragment）的抽象数据树
 */
export class Parser {
  static parserHTML(html: string) {
    return new DOMParser().parseFromString(html, 'text/html').body;
  }
  constructor(private componentLoaders: ComponentLoader[] = [],
              private formatters: Formatter[] = []) {
  }

  parse(el: HTMLElement) {
    const rootSlot = new Fragment();
    this.readComponent(el, rootSlot);
    return rootSlot;
  }

  private readComponent(el: Node, slot: Fragment) {
    if (el.nodeType === Node.ELEMENT_NODE) {
      for (const t of this.componentLoaders) {
        if (t.match(el as HTMLElement)) {
          const viewData = t.read(el as HTMLElement);
          slot.append(viewData.component, false);
          viewData.slotsMap.forEach(item => {
            if (!item.from) {
              return;
            }
            if (viewData.component instanceof DivisionAbstractComponent ||
              viewData.component instanceof BranchAbstractComponent ||
              viewData.component instanceof BackboneAbstractComponent ||
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
      const textContent = el.textContent;
      if (/^[\r\n]+$/.test(textContent)) {
        return;
      }
      slot.append(textContent, false);
    }
  }

  private readFormats(el: HTMLElement, slot: Fragment) {
    const maps = this.formatters.map(f => {
      return {
        formatter: f,
        effect: f.match(el)
      }
    }).filter(p => p.effect !== FormatEffect.Invalid).map(p => {
      return {
        ...p,
        formatData: p.formatter.read(el as HTMLElement)
      }
    });
    const startIndex = slot.length;
    Array.from(el.childNodes).forEach(child => {
      this.readComponent(child, slot);
    })
    maps.forEach(item => {
      slot.apply(item.formatter, {
        startIndex,
        endIndex: slot.length,
        formatData: item.formatData,
        effect: item.effect
      }, {
        important: false
      })
    })
  }
}
