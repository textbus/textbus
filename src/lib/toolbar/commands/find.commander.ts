import { Injector } from '@tanbo/di';

import {
  CommandContext,
  Commander,
  ElementPosition,
  FormatData,
  FormatEffect, FormatRendingContext,
  FormatterPriority, Fragment,
  InlineFormatter,
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

  read(): FormatData {
    return null;
  }

  render(context: FormatRendingContext, existingElement?: VElement) {
    if (context.isOutputMode) {
      return null;
    }
    const flag = !!existingElement;
    if (!existingElement) {
      existingElement = new VElement('span');
    }

    existingElement.styles.set('backgroundColor', '#ff0');
    existingElement.styles.set('color', '#000');

    return flag ? null : existingElement;
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
      effect: FormatEffect.Invalid,
      formatData: null,
      startIndex: 0,
      endIndex: this.rootFragment.length
    })
    positions.forEach(item => {
      item.fragment.apply(findFormatter, {
        effect: FormatEffect.Valid,
        formatData: null,
        startIndex: item.startIndex,
        endIndex: item.endIndex
      })
    })
  }
}
