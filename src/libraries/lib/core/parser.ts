import { Plugin } from './help';
import { Slot } from './abstract-data';

export class Parser {
  constructor(private plugins: Plugin[]) {
  }

  parse(el: HTMLElement) {
    const root = new Slot();
    this.plugins.forEach(plugin => {
      if (plugin.matcher.match(el)) {
        plugin.abstractData.from(el, root);
      }
    });
    return root;
  }
}
