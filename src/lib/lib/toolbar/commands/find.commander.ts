import {
  ChildSlotModel,
  Commander,
  ElementPosition,
  FormatAbstractData,
  FormatEffect,
  FormatterPriority,
  Fragment,
  InlineFormatter,
  Renderer,
  ReplaceModel,
  TBSelection,
  VElement
} from '../../core/_api';

class FindFormatter extends InlineFormatter {
  constructor() {
    super({}, FormatterPriority.InlineStyle);
  }

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
    if (isProduction) {
      return null;
    }
    const flag = !!existingElement;
    if (!existingElement) {
      existingElement = new VElement('span');
    }

    existingElement.styles.set('backgroundColor', '#ff0');
    existingElement.styles.set('color', '#000');

    return flag ? null : new ReplaceModel(existingElement);
  }
}

export const findFormatter = new FindFormatter();

export class FindCommander implements Commander<ElementPosition[]> {
  recordHistory = false;

  command(selection: TBSelection, positions: ElementPosition[], overlap: boolean, renderer: Renderer, rootFragment: Fragment) {
    rootFragment.apply(findFormatter, {
      state: FormatEffect.Invalid,
      abstractData: null,
      startIndex: 0,
      endIndex: rootFragment.contentLength
    })
    positions.forEach(item => {
      item.fragment.apply(findFormatter, {
        state: FormatEffect.Valid,
        abstractData: null,
        startIndex: item.startIndex,
        endIndex: item.endIndex
      })
    })
  }
}
