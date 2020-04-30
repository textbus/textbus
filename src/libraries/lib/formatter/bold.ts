import { EditableOptions, Formatter } from '../core/formatter';
import { AbstractData } from '../core/abstract-data';

export class Bold extends Formatter {
  editableOptions: EditableOptions = {
    tag: true
  };

  is(node: HTMLElement): boolean {
    return node.nodeName.toLowerCase() === 'strong';
  }

  renderer(data: AbstractData): any {
  }
}
