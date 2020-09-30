import {
  ChildSlotModel, CommandContext,
  Commander,
  ElementPosition,
  FormatAbstractData,
  FormatEffect, FormatRendingContext,
  FormatterPriority,
  InlineFormatter,
  ReplaceModel,
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

  render(context: FormatRendingContext, existingElement?: VElement): ChildSlotModel | ReplaceModel | null {
    if (context.isOutputMode) {
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

  command(context: CommandContext, positions: ElementPosition[]) {
    context.rootFragment.apply(findFormatter, {
      state: FormatEffect.Invalid,
      abstractData: null,
      startIndex: 0,
      endIndex: context.rootFragment.contentLength
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
