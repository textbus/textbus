import { extractData, Formatter } from '../core/formatter';
import { AbstractData } from '../core/abstract-data';
import { VElement } from '../core/element';
import { ChildSlotModel } from '../core/renderer';

export class Bold implements Formatter {
  is(node: HTMLElement): boolean {
    return node.nodeName.toLowerCase() === 'strong';
  }

  read(node: HTMLElement): AbstractData {
    return extractData(node, {
      tag: true
    });
  }

  render(abstractData: AbstractData) {
    return new ChildSlotModel(new VElement('strong'));
  }
}
