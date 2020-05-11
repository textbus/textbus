import { extractData, Formatter } from '../core/formatter';
import { AbstractData } from '../core/abstract-data';
import { VElement } from '../core/element';
import { ChildSlotModel } from '../core/renderer';

export class Color implements Formatter {
  is(node: HTMLElement): boolean {
    return !!node.style.color;
  }

  read(node: HTMLElement): AbstractData {
    return extractData(node, {
      styleName: 'color'
    });
  }

  render(abstractData: AbstractData, existingElement?: VElement) {
    if (existingElement) {
      existingElement.styles.set('color', abstractData.style.value);
    } else {
      const el = new VElement('span');
      el.styles.set('color', abstractData.style.value);
      return new ChildSlotModel(el);
    }
  }
}
