import { Injector } from '@tanbo/di';

import {
  ChildSlotMode, CommandContext,
  Commander,
  ElementPosition,
  FormatAbstractData,
  FormatEffect, FormatRendingContext,
  FormatterPriority, Fragment,
  InlineFormatter,
  ReplaceMode,
  VElement
} from '../../core/_api';
import { RootComponent } from '../../root-component';

class FindFormatter extends InlineFormatter {
  constructor() {
    super({}, FormatterPriority.InlineStyle);
  }

  match() {
    return FormatEffect.Invalid;
  }

  read(): FormatAbstractData {
    return null;
  }

  render(context: FormatRendingContext, existingElement?: VElement): ChildSlotMode | ReplaceMode | null {
    if (context.isOutputMode) {
      return null;
    }
    const flag = !!existingElement;
    if (!existingElement) {
      existingElement = new VElement('span');
    }

    existingElement.styles.set('backgroundColor', '#ff0');
    existingElement.styles.set('color', '#000');

    return flag ? null : new ReplaceMode(existingElement);
  }
}

export const findFormatter = new FindFormatter();

export class FindCommander implements Commander<ElementPosition[]> {
  recordHistory = false;

  private rootFragment: Fragment;

  setup(injector: Injector) {
    this.rootFragment = injector.get(RootComponent).slot;
  }

  command(context: CommandContext, positions: ElementPosition[]) {
    this.rootFragment.apply(findFormatter, {
      state: FormatEffect.Invalid,
      abstractData: null,
      startIndex: 0,
      endIndex: this.rootFragment.contentLength
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
