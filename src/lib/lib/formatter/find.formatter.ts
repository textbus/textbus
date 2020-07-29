import {
  ChildSlotModel,
  FormatAbstractData,
  FormatEffect,
  InlineFormatter,
  ReplaceModel,
  VElement
} from '../core/_api';

export class FindFormatter extends InlineFormatter {
  match() {
    return FormatEffect.Invalid;
  }

  read(node: HTMLElement): FormatAbstractData {
    return null;
  }

  render(isProduction: boolean,
         state: FormatEffect,
         abstractData: FormatAbstractData,
         existingElement?: VElement): ChildSlotModel | ReplaceModel | null {
    const flag = !!existingElement;
    if (!existingElement) {
      existingElement = new VElement('span');
    }

    existingElement.styles.set('backgroundColor', '#ff0');
    existingElement.styles.set('color', '#000');

    return flag ? new ChildSlotModel(existingElement) : new ReplaceModel(existingElement);
  }
}
