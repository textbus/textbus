import { Plugin } from './help';
import { Slot } from './abstract-data';

export class Parser {
  constructor(private plugins: Plugin[]) {
  }

  parse(el: HTMLElement) {
    return this.makeAbstractData(el, new Slot());
  }

  private makeAbstractData(el: HTMLElement, slot: Slot) {

    this.plugins.forEach(plugin => {
      if (plugin.matcher.match(el)) {
        plugin.abstractData.from(el, slot).forEach(item => {
          const {toSlot, read} = item;
          if (read.nodeType === 1) {
            this.makeAbstractData(read as HTMLElement, toSlot);
          }
        });
      }
    });
    return slot;
  }
}
